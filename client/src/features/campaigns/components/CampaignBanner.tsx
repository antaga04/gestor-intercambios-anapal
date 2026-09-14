import { CalendarDays, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { isCampaignClosed, useActiveCampaign } from '@/features/campaigns/hooks';
import { daysUntil, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

export function CampaignBanner() {
    const { data: campaign, isLoading } = useActiveCampaign();
    if (isLoading) return <Skeleton className="h-20 w-full" />;
    if (!campaign) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-4 text-sm text-muted-foreground">
                    No hay ninguna campaña activa todavía.
                </CardContent>
            </Card>
        );
    }
    const closed = isCampaignClosed(campaign);
    const days = daysUntil(campaign.exchangeDeadline);
    const urgent = !closed && days <= 7;

    return (
        <Card className={cn(closed && 'border-destructive/50', urgent && 'border-primary/60')}>
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold">{campaign.name}</h2>
                    {closed ? (
                        <Badge variant="destructive">Plazo cerrado</Badge>
                    ) : (
                        <Badge variant={urgent ? 'default' : 'secondary'}>
                            {days <= 0 ? 'Último día' : days === 1 ? 'Queda 1 día' : `Quedan ${days} días`}
                        </Badge>
                    )}
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="size-4" /> Sorteo {formatDate(campaign.drawDate)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <Clock className="size-4" /> Plazo hasta {formatDate(campaign.exchangeDeadline)}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}
