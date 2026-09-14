import type { ReactNode } from 'react';
import { MapPin, Phone, User as UserIcon } from 'lucide-react';
import type { PublicUser } from '@anapal/shared';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface UserCardProps {
    user: PublicUser;
    action?: ReactNode;
    className?: string;
    compact?: boolean;
}

export function UserCard({ user, action, className, compact }: UserCardProps) {
    return (
        <div className={cn('flex items-start justify-between gap-3 rounded-lg border p-3', className)}>
            <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                        Nº {user.receptorNumber}
                    </Badge>
                    <span className="truncate font-medium">{user.name}</span>
                </div>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" />
                    <span className="truncate">
                        {user.poblacion} ({user.provincia})
                    </span>
                </p>
                {!compact && (user.phone || user.contactName) && (
                    <p className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        {user.phone && (
                            <span className="inline-flex items-center gap-1.5">
                                <Phone className="size-3.5" /> {user.phone}
                            </span>
                        )}
                        {user.contactName && (
                            <span className="inline-flex items-center gap-1.5">
                                <UserIcon className="size-3.5" /> {user.contactName}
                            </span>
                        )}
                    </p>
                )}
            </div>
            {action}
        </div>
    );
}
