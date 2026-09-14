import { env } from '@/config/env';
import { User } from '@/api/models/user';
import { hashPassword } from '@/utils/password';

export async function seedSuperadmin() {
    if (!env.SUPERADMIN_EMAIL || !env.SUPERADMIN_PASSWORD) {
        console.warn('[seed] SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD not set — skipping superadmin');
        return;
    }
    const passwordHash = await hashPassword(env.SUPERADMIN_PASSWORD);
    const user = await User.findOneAndUpdate(
        { email: env.SUPERADMIN_EMAIL },
        {
            $set: { passwordHash, role: 'superadmin', status: 'active', mustChangePassword: false },
            $setOnInsert: {
                email: env.SUPERADMIN_EMAIL,
                receptorNumber: env.SUPERADMIN_RECEPTOR_NUMBER ?? '00000',
                name: 'ANAPAL',
                poblacion: 'Madrid',
                provincia: 'Madrid',
            },
        },
        { upsert: true, new: true },
    );
    console.log(`[seed] superadmin ready: ${user.email}`);
}
