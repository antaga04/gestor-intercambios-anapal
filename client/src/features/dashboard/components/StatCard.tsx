import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StatCardProps {
    label: string;
    value: string | number;
    hint?: string;
    icon?: LucideIcon;
    to?: string;
    loading?: boolean;
    highlight?: boolean;
}

export function StatCard({ label, value, hint, icon: Icon, to, loading, highlight }: StatCardProps) {
    const content = (
        <Card
            className={cn('h-full transition-colors', highlight && 'border-primary', to && 'hover:border-primary/60')}
        >
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                {Icon && (
                    <CardAction>
                        <Icon className={cn('size-4', highlight ? 'text-primary' : 'text-muted-foreground')} />
                    </CardAction>
                )}
            </CardHeader>
            <CardContent>
                {loading ? (
                    <Skeleton className="h-8 w-16" />
                ) : (
                    <p className={cn('text-2xl font-semibold', highlight && 'text-primary')}>{value}</p>
                )}
                {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
            </CardContent>
        </Card>
    );
    return to ? <Link to={to}>{content}</Link> : content;
}
