/**
 * Seed: creates/updates the superadmin and a default active campaign.
 *   pnpm seed          → superadmin + default campaign
 *   pnpm seed --demo   → also 10 fake active admons (password: Demo1234). Never run against production.
 */
import mongoose from 'mongoose';
import { env } from '@/config/env';
import { connectToDatabase } from '@/config/db';
import { seedSuperadmin } from '@/seed/superadmin';
import { seedDefaultCampaign } from '@/seed/campaign';
import { seedDemoExchanges, seedDemoUsers } from '@/seed/demo';

async function main() {
    const demo = process.argv.includes('--demo');
    if (demo && env.IS_PRODUCTION) throw new Error('Refusing to seed demo data with IS_PRODUCTION=true');

    await connectToDatabase();
    await seedSuperadmin();
    await seedDefaultCampaign();
    if (demo) {
        await seedDemoUsers();
        await seedDemoExchanges();
    }
}

main()
    .then(() => mongoose.disconnect())
    .then(() => {
        console.log('[seed] done');
        process.exit(0);
    })
    .catch((err) => {
        console.error('[seed] failed:', err);
        process.exit(1);
    });
