import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
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
            className={cn(
                'h-full py-5 transition-all',
                highlight && 'border-primary/50 bg-primary/[0.03]',
                to && 'hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft-lg',
            )}
        >
            <CardContent className="flex items-start justify-between gap-3 px-5">
                <div className="min-w-0 space-y-1.5">
                    <p className="truncate text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {label}
                    </p>
                    {loading ? (
                        <Skeleton className="h-8 w-16" />
                    ) : (
                        <p
                            className={cn(
                                'font-heading text-2xl font-bold tracking-tight',
                                highlight && 'text-primary',
                            )}
                        >
                            {value}
                        </p>
                    )}
                    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
                </div>
                {Icon && (
                    <span
                        className={cn(
                            'flex size-9 shrink-0 items-center justify-center rounded-full',
                            highlight ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                        )}
                    >
                        <Icon className="size-4" />
                    </span>
                )}
            </CardContent>
        </Card>
    );
    return to ? (
        <Link to={to} className="block">
            {content}
        </Link>
    ) : (
        content
    );
}
