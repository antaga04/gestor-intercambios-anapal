import type { NextFunction, Request, Response } from 'express';
import { objectIdSchema } from '@anapal/shared';
import { Campaign } from '@/api/models/campaign';
import { AppError } from '@/utils/AppError';
import { isAdmin } from '@/middlewares/authorize';

/**
 * Loads the campaign into `req.campaign`: the active one by default, or `?campaign=<id>` when given.
 * 409 `campaign.none_active` when there is none.
 */
export async function activeCampaign(req: Request, _res: Response, next: NextFunction) {
    const override = typeof req.query.campaign === 'string' ? req.query.campaign : undefined;
    if (override) {
        const parsed = objectIdSchema.safeParse(override);
        if (!parsed.success) return next(new AppError(400, 'validation.invalid_id', 'Invalid campaign id'));
        const campaign = await Campaign.findById(parsed.data);
        if (!campaign) return next(new AppError(404, 'campaign.not_found', 'Campaign not found'));
        req.campaign = campaign;
        return next();
    }
    const campaign = await Campaign.findOne({ isActive: true });
    if (!campaign) return next(new AppError(409, 'campaign.none_active', 'No active campaign'));
    req.campaign = campaign;
    next();
}

export function isCampaignClosed(campaign: { exchangeDeadline: Date }): boolean {
    return Date.now() > campaign.exchangeDeadline.getTime();
}

/** Blocks mutating actions for plain users after the exchange deadline. Admins are exempt. */
export function requireOpenCampaign(req: Request, _res: Response, next: NextFunction) {
    if (!req.campaign) return next(new AppError(409, 'campaign.none_active', 'No active campaign'));
    if (!isAdmin(req.user?.role) && isCampaignClosed(req.campaign)) {
        return next(new AppError(403, 'campaign.closed', 'Campaign exchange deadline has passed'));
    }
    next();
}
