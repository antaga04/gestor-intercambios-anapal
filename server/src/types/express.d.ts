import type { Role } from '@anapal/shared';
import type { CampaignDocument } from '@/api/models/campaign';

export interface AuthUser {
    id: string;
    role: Role;
    /** Refresh-token family of the session that issued the access token. */
    family: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
            /** Parsed + validated query (Express 5 makes `req.query` read-only). */
            validatedQuery?: unknown;
            campaign?: CampaignDocument;
        }
    }
}
