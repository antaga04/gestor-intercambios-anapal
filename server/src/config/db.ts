import mongoose from 'mongoose';
import { env } from '@/config/env';

// Cache the connection promise across warm serverless invocations.
const globalWithMongoose = globalThis as typeof globalThis & { __mongooseConn?: Promise<typeof mongoose> };

export function connectToDatabase(): Promise<typeof mongoose> {
    if (!globalWithMongoose.__mongooseConn) {
        mongoose.set('strictQuery', true);
        globalWithMongoose.__mongooseConn = mongoose
            .connect(env.MONGO_URL, { serverSelectionTimeoutMS: 8000 })
            .then((conn) => {
                console.log('[db] connected');
                return conn;
            })
            .catch((err) => {
                globalWithMongoose.__mongooseConn = undefined;
                console.error('[db] connection error:', err);
                throw err;
            });
    }
    return globalWithMongoose.__mongooseConn;
}

export function isDatabaseConnected(): boolean {
    return mongoose.connection.readyState === 1;
}
