import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { env } from '@/config/env';
import { connectToDatabase } from '@/config/db';
import mainRouter from '@/api/routes/index';
import { requestId } from '@/middlewares/requestId';
import { errorHandler, notFoundHandler } from '@/middlewares/errorHandler';
import { asyncHandler } from '@/utils/asyncHandler';
import { healthCheck } from '@/api/controllers/health';

export function createApp(): Express {
    const app = express();

    app.disable('x-powered-by');
    app.set('trust proxy', 1);

    app.use(requestId);
    app.use(helmet());
    app.use(cookieParser());

    // In production the client project proxies /api to this app, so requests are same-origin.
    // CORS is only needed when the client is served from another origin (local dev without proxy).
    if (!env.IS_PRODUCTION) {
        app.use(
            cors({
                origin: env.CLIENT_URL,
                methods: ['GET', 'PUT', 'PATCH', 'POST', 'DELETE'],
                allowedHeaders: ['Content-Type'],
                credentials: true,
            }),
        );
    }

    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ limit: '1mb', extended: true }));

    // Health check must not depend on the database.
    app.get('/api/health', healthCheck);

    // Lazily connect (and reuse) the Mongo connection — required for serverless cold starts.
    app.use(
        asyncHandler(async (_req, _res, next) => {
            await connectToDatabase();
            next();
        }),
    );

    app.use('/api', mainRouter);

    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
}
