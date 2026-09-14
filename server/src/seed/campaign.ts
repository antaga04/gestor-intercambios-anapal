import { Campaign } from '@/api/models/campaign';

export async function seedDefaultCampaign() {
    const existing = await Campaign.findOne({ isActive: true });
    if (existing) {
        console.log(`[seed] active campaign already exists: ${existing.name}`);
        return;
    }
    const year = new Date().getFullYear();
    const campaign = await Campaign.create({
        name: `Navidad ${year}`,
        drawDate: new Date(Date.UTC(year, 11, 22, 8, 0, 0)),
        exchangeDeadline: new Date(Date.UTC(year, 11, 1, 22, 59, 59)),
        isActive: true,
        barcode: { dayDigit: '6', jornada: '102' },
        landingText:
            'Intercambio de lotería de Navidad entre administraciones asociadas a ANAPAL. Registra tu administración, ' +
            'crea tus intercambios, imprime los sobres y lleva el control de lo que das y recibes.',
    });
    console.log(`[seed] created campaign: ${campaign.name}`);
}
