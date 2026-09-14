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
