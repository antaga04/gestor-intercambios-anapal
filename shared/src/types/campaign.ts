export interface CampaignBarcode {
    dayDigit: '5' | '6';
    jornada: string;
}

export interface Campaign {
    _id: string;
    name: string;
    drawDate: string;
    exchangeDeadline: string;
    isActive: boolean;
    barcode?: CampaignBarcode;
    landingText?: string;
    createdAt: string;
    updatedAt: string;
}

/** Request bodies as they travel over the wire: dates are ISO strings (zod coerces them server-side). */
export interface CreateCampaignBody {
    name: string;
    drawDate: string;
    exchangeDeadline: string;
    isActive?: boolean;
    barcode?: CampaignBarcode;
    landingText?: string;
}

export interface UpdateCampaignBody {
    name?: string;
    drawDate?: string;
    exchangeDeadline?: string;
    isActive?: boolean;
    barcode?: CampaignBarcode | null;
    landingText?: string | null;
}
