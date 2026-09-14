import { z } from 'zod';

const boolFromString = z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1');

const envSchema = z.object({
    PORT: z.coerce.number().int().positive().default(8000),
    IS_PRODUCTION: boolFromString,
    VERCEL: z.string().optional(),
    CLIENT_URL: z.string().url().default('http://localhost:5173'),
    COOKIE_DOMAIN: z
        .string()
        .optional()
        .transform((v) => (v ? v : undefined)),

    MONGO_URL: z.string().min(1, 'MONGO_URL is required'),

    ACCESS_TOKEN_SECRET: z.string().min(16),
    REFRESH_TOKEN_SECRET: z.string().min(16),
    ACCESS_TOKEN_TTL: z.string().default('15m'),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
    EMAIL_CONFIRMATION_SECRET: z.string().min(16),
    EMAIL_CONFIRMATION_TTL: z.string().default('24h'),

    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().default('Intercambios ANAPAL <noreply@example.com>'),

    SUPERADMIN_EMAIL: z.string().email().optional(),
    SUPERADMIN_PASSWORD: z.string().optional(),
    SUPERADMIN_RECEPTOR_NUMBER: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
    // Treat empty strings (e.g. `FOO=` in .env) as unset so optional vars validate.
    const raw = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== undefined && v !== ''));
    const parsed = envSchema.safeParse(raw);
    if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
        throw new Error(`Invalid environment variables:\n${issues}`);
    }
    return parsed.data;
}

export const env: Env = loadEnv();
