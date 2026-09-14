import type { LoginInput, MeUser, RegisterInput } from '@anapal/shared';
import { ME_USER_FIELDS, User, type UserDocument } from '@/api/models/user';
import { PasswordResetRequest } from '@/api/models/passwordResetRequest';
import { AppError } from '@/utils/AppError';
import { sendVerificationEmail } from '@/utils/email';
import { signEmailVerificationToken, verifyEmailVerificationToken } from '@/utils/jwt';
import { hashPassword, verifyPassword } from '@/utils/password';

const VERIFICATION_EMAILS_PER_USER_PER_DAY = 3;
/** Leaves headroom under Resend's 100/day free tier. */
const VERIFICATION_EMAILS_GLOBAL_PER_DAY = 90;
const DAY_MS = 86_400_000;

export interface RegisterResult {
    email: string;
    emailSent: boolean;
}

export async function register(input: RegisterInput): Promise<RegisterResult> {
    const { password, ...rest } = input;

    const [emailTaken, receptorTaken] = await Promise.all([
        User.exists({ email: rest.email }),
        User.exists({ receptorNumber: rest.receptorNumber }),
    ]);
    if (emailTaken) throw new AppError(409, 'auth.email_taken', 'Email already registered');
    if (receptorTaken) throw new AppError(409, 'auth.receptor_taken', 'Receptor number already registered');

    const user = await User.create({
        ...rest,
        passwordHash: await hashPassword(password),
        role: 'user',
        status: 'pending',
    });
    const emailSent = await trySendVerification(user);
    return { email: user.email, emailSent };
}

async function trySendVerification(user: UserDocument): Promise<boolean> {
    const token = signEmailVerificationToken(user._id.toString());
    const result = await sendVerificationEmail(user.email, user.name, token);
    if (!result.ok) return false;
    const windowCount = isWithinDay(user.lastVerificationEmailAt) ? user.verificationEmailsWindowCount + 1 : 1;
    await User.updateOne(
        { _id: user._id },
        {
            $inc: { verificationEmailsSent: 1 },
            $set: { lastVerificationEmailAt: new Date(), verificationEmailsWindowCount: windowCount },
        },
    );
    return true;
}

function isWithinDay(date: Date | null | undefined): boolean {
    return !!date && Date.now() - date.getTime() < DAY_MS;
}

export async function verifyEmail(token: string): Promise<'verified' | 'already_verified'> {
    const userId = verifyEmailVerificationToken(token);
    const user = await User.findById(userId).select('status');
    if (!user) throw new AppError(400, 'auth.token_invalid', 'User not found');
    if (user.status === 'active') return 'already_verified';
    if (user.status === 'blocked') throw new AppError(403, 'auth.blocked', 'User blocked');
    user.status = 'active';
    await user.save();
    return 'verified';
}

/** Always resolves (never leaks whether the email exists); throws only on cap errors for a real pending user. */
export async function resendVerification(email: string): Promise<void> {
    const user = await User.findOne({ email });
    if (!user || user.status !== 'pending') return;

    const recentForUser = isWithinDay(user.lastVerificationEmailAt) ? user.verificationEmailsWindowCount : 0;
    if (recentForUser >= VERIFICATION_EMAILS_PER_USER_PER_DAY) {
        throw new AppError(429, 'email.daily_cap', 'Per-user daily verification email cap reached');
    }
    const globalToday = await User.countDocuments({ lastVerificationEmailAt: { $gte: startOfToday() } });
    if (globalToday >= VERIFICATION_EMAILS_GLOBAL_PER_DAY) {
        throw new AppError(429, 'email.daily_cap', 'Global daily verification email cap reached');
    }

    const sent = await trySendVerification(user);
    if (!sent) throw new AppError(502, 'email.send_failed', 'Email provider error');
}

function startOfToday(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

export async function login(input: LoginInput): Promise<UserDocument> {
    const user = await User.findOne({ email: input.email }).select(`+passwordHash ${ME_USER_FIELDS}`);
    const valid = await verifyPassword(input.password, user?.passwordHash);
    if (!user || !valid) throw new AppError(401, 'auth.invalid_credentials', 'Invalid credentials');
    if (user.status === 'pending') throw new AppError(403, 'auth.email_not_verified', 'Email not verified');
    if (user.status === 'blocked') throw new AppError(403, 'auth.blocked', 'User blocked');

    user.lastLoginAt = new Date();
    user.lastSeenAt = user.lastLoginAt;
    await user.save();
    return user;
}

export async function forgotPassword(email: string): Promise<void> {
    const user = await User.findOne({ email }).select('_id');
    if (!user) return;
    await PasswordResetRequest.findOneAndUpdate(
        { user: user._id, status: 'pending' },
        { $set: { requestedAt: new Date() }, $setOnInsert: { user: user._id, status: 'pending' } },
        { upsert: true },
    );
}

export function toMeUser(user: UserDocument): MeUser {
    return {
        _id: user._id.toString(),
        receptorNumber: user.receptorNumber,
        name: user.name,
        poblacion: user.poblacion,
        provincia: user.provincia,
        address: user.address ?? undefined,
        phone: user.phone ?? undefined,
        contactName: user.contactName ?? undefined,
        email: user.email,
        role: user.role,
        status: user.status,
        mustChangePassword: user.mustChangePassword,
        createdAt: user.createdAt.toISOString(),
    };
}
