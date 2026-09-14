import type { Role, UserStatus } from '@anapal/shared';
import { Badge } from '@/components/ui/badge';
import { ROLE_LABELS, USER_STATUS_LABELS } from '@/lib/labels';
import { cn } from '@/lib/utils';

const STYLES: Record<UserStatus, string> = {
    pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    active: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    blocked: 'bg-destructive/15 text-destructive',
};

export function UserStatusBadge({ status, className }: { status: UserStatus; className?: string }) {
    return (
        <Badge variant="outline" className={cn('border-transparent', STYLES[status], className)}>
            {USER_STATUS_LABELS[status]}
        </Badge>
    );
}

export function RoleBadge({ role }: { role: Role }) {
    if (role === 'user') return <span className="text-muted-foreground">Usuario</span>;
    return (
        <Badge variant={role === 'superadmin' ? 'default' : 'secondary'} className="gap-1">
            {role === 'superadmin' ? '👑 ' : ''}
            {ROLE_LABELS[role]}
        </Badge>
    );
}
