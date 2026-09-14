import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { ExchangeSummary } from '@anapal/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DirectionBadge } from '@/components/common/DirectionBadge';
import { StatusBadge } from '@/components/common/StatusBadge';
import { UserCard } from '@/components/common/UserCard';
import { useAuth } from '@/features/auth/hooks';
import { formatBilletes, formatRelative } from '@/lib/format';

export function LastExchangeCard({ exchange }: { exchange: ExchangeSummary }) {
    const { user } = useAuth();
    const counterpart = exchange.from._id === user?._id ? exchange.to : exchange.from;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Último movimiento</CardTitle>
                <CardDescription>Actualizado {formatRelative(exchange.updatedAt)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <UserCard user={counterpart} compact />
                <div className="flex flex-wrap items-center gap-2">
                    <DirectionBadge direction={exchange.direction} />
                    <StatusBadge status={exchange.status} />
                    <span className="text-sm text-muted-foreground">
                        {exchange.rowCount} {exchange.rowCount === 1 ? 'número' : 'números'} ·{' '}
                        <strong className="text-foreground">{formatBilletes(exchange.totalDecimos)}</strong> billetes
                    </span>
                </div>
                <Button asChild variant="outline" size="sm">
                    <Link to={`/intercambios/${exchange._id}`}>
                        Ver intercambio <ArrowRight />
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}
