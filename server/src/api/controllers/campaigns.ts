import type { Request, Response } from 'express';
import type { CreateCampaignInput, UpdateCampaignInput } from '@anapal/shared';
import * as campaignsService from '@/api/services/campaigns';
import { asyncHandler } from '@/utils/asyncHandler';
import { sendSuccess } from '@/utils/response';

const { toCampaignDto } = campaignsService;

export const getActive = asyncHandler(async (_req: Request, res: Response) => {
    const campaign = await campaignsService.getActive();
    return sendSuccess(res, 200, { i18n: 'campaign.detail', message: 'OK', payload: toCampaignDto(campaign) });
});

export const list = asyncHandler(async (_req: Request, res: Response) => {
    const campaigns = await campaignsService.list();
    return sendSuccess(res, 200, { i18n: 'campaign.list', message: 'OK', payload: campaigns.map(toCampaignDto) });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
    const campaign = await campaignsService.create(req.body as CreateCampaignInput, req.user!.id);
    return sendSuccess(res, 201, {
        i18n: 'campaign.created',
        message: 'Campaign created',
        payload: toCampaignDto(campaign),
    });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
    const campaign = await campaignsService.update(req.params.id as string, req.body as UpdateCampaignInput);
    return sendSuccess(res, 200, {
        i18n: 'campaign.updated',
        message: 'Campaign updated',
        payload: toCampaignDto(campaign),
    });
});
