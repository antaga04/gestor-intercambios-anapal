import type {
    ChangePasswordInput,
    Paginated,
    PublicUser,
    UpdateProfileInput,
    UserDirectoryQuery,
} from '@anapal/shared';
import { ME_USER_FIELDS, PUBLIC_USER_FIELDS, User, type UserDocument } from '@/api/models/user';
import { AppError } from '@/utils/AppError';
import { escapeRegex, paginate } from '@/utils/pagination';
import { hashPassword, verifyPassword } from '@/utils/password';
import { revokeAllSessions } from '@/api/services/session';

export async function getMe(userId: string): Promise<UserDocument> {
    const user = await User.findById(userId).select(ME_USER_FIELDS);
    if (!user) throw new AppError(404, 'user.not_found', 'User not found');
    return user;
}

/** Public directory: active users other than me, searchable by receptor number prefix, name or población. */
export async function directory(meId: string, query: UserDirectoryQuery): Promise<Paginated<PublicUser>> {
    const filter: Record<string, unknown> = { status: 'active', _id: { $ne: meId } };
    if (query.provincia) filter.provincia = query.provincia;
    if (query.q) {
        const rx = new RegExp(escapeRegex(query.q), 'i');
        filter.$or = [{ receptorNumber: new RegExp('^' + escapeRegex(query.q)) }, { name: rx }, { poblacion: rx }];
    }
    const result = await paginate(
        User.find(filter).select(PUBLIC_USER_FIELDS).sort({ receptorNumber: 1 }).lean(),
        query,
    );
    return { ...result, items: result.items.map(toPublicUser) };
}

export async function getPublic(id: string): Promise<PublicUser> {
    const user = await User.findOne({ _id: id, status: 'active' }).select(PUBLIC_USER_FIELDS).lean();
    if (!user) throw new AppError(404, 'user.not_found', 'User not found');
    return toPublicUser(user);
}

export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<UserDocument> {
    const user = await User.findByIdAndUpdate(userId, { $set: input }, { new: true, runValidators: true }).select(
        ME_USER_FIELDS,
    );
    if (!user) throw new AppError(404, 'user.not_found', 'User not found');
    return user;
}

export async function changePassword(userId: string, family: string, input: ChangePasswordInput): Promise<void> {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) throw new AppError(404, 'user.not_found', 'User not found');
    const ok = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!ok) throw new AppError(400, 'auth.wrong_password', 'Wrong current password');
    user.passwordHash = await hashPassword(input.newPassword);
    user.mustChangePassword = false;
    await user.save();
    await revokeAllSessions(userId, family);
}

export function toPublicUser(user: {
    _id: unknown;
    receptorNumber: string;
    name: string;
    poblacion: string;
    provincia: string;
    address?: string | null;
    phone?: string | null;
    contactName?: string | null;
}): PublicUser {
    return {
        _id: String(user._id),
        receptorNumber: user.receptorNumber,
        name: user.name,
        poblacion: user.poblacion,
        provincia: user.provincia,
        address: user.address ?? undefined,
        phone: user.phone ?? undefined,
        contactName: user.contactName ?? undefined,
    };
}
