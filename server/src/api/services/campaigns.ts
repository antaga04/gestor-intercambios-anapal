import type { Campaign as CampaignDto, CreateCampaignInput, UpdateCampaignInput } from '@anapal/shared';
import { Campaign, type CampaignDocument } from '@/api/models/campaign';
import { AppError } from '@/utils/AppError';

export async function getActive(): Promise<CampaignDocument> {
    const campaign = await Campaign.findOne({ isActive: true });
    if (!campaign) throw new AppError(404, 'campaign.none_active', 'No active campaign');
    return campaign;
}

export function list(): Promise<CampaignDocument[]> {
    return Campaign.find().sort({ drawDate: -1 }).exec();
}

export async function create(input: CreateCampaignInput, createdBy: string): Promise<CampaignDocument> {
    if (await Campaign.exists({ name: input.name })) {
        throw new AppError(409, 'campaign.name_taken', 'Campaign name already exists');
    }
    if (input.isActive) await Campaign.updateMany({ isActive: true }, { $set: { isActive: false } });
    return Campaign.create({ ...input, createdBy });
}

export async function update(id: string, input: UpdateCampaignInput): Promise<CampaignDocument> {
    const campaign = await Campaign.findById(id);
    if (!campaign) throw new AppError(404, 'campaign.not_found', 'Campaign not found');

    if (input.name && input.name !== campaign.name && (await Campaign.exists({ name: input.name }))) {
        throw new AppError(409, 'campaign.name_taken', 'Campaign name already exists');
    }
    if (input.isActive === false && campaign.isActive) {
        throw new AppError(409, 'campaign.must_keep_active', 'Activate another campaign first');
    }
    if (input.isActive === true && !campaign.isActive) {
        await Campaign.updateMany({ isActive: true, _id: { $ne: campaign._id } }, { $set: { isActive: false } });
    }

    const { barcode, landingText, ...rest } = input;
    campaign.set(rest);
    if (barcode !== undefined) campaign.set('barcode', barcode ?? undefined);
    if (landingText !== undefined) campaign.set('landingText', landingText ?? undefined);

    const drawDate = campaign.drawDate;
    const deadline = campaign.exchangeDeadline;
    if (deadline > drawDate) {
        throw new AppError(400, 'validation.failed', 'Deadline must not be after the draw date', [
            { path: 'exchangeDeadline', message: 'La fecha límite debe ser anterior o igual a la del sorteo' },
        ]);
    }
    await campaign.save();
    return campaign;
}

export function toCampaignDto(c: CampaignDocument): CampaignDto {
    return {
        _id: c._id.toString(),
        name: c.name,
        drawDate: c.drawDate.toISOString(),
        exchangeDeadline: c.exchangeDeadline.toISOString(),
        isActive: c.isActive,
        barcode: c.barcode ? { dayDigit: c.barcode.dayDigit, jornada: c.barcode.jornada } : undefined,
        landingText: c.landingText ?? undefined,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
    };
}
