import { env } from '@/config/env';
import { createApp } from '@/app';

const app = createApp();

if (!env.VERCEL) {
    app.listen(env.PORT, () => {
        console.log(`[server] running at http://localhost:${env.PORT}`);
    });
}

export default app;
