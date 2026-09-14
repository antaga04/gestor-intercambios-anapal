import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ban, CircleCheck, Eye, KeyRound, LogOut, MoreHorizontal, ShieldCheck, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import type { AdminUser } from '@anapal/shared';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { SetPasswordDialog } from '@/features/admin/components/SetPasswordDialog';
import { useRevokeUserSessions, useSetUserRole, useSetUserStatus } from '@/features/admin/hooks';
import { useAuth } from '@/features/auth/hooks';
import { ApiClientError } from '@/lib/api';
import { t } from '@/lib/messages';

interface AdminUserActionsProps {
    user: AdminUser;
    /** `menu` for table rows, `buttons` for the detail page. */
    variant?: 'menu' | 'buttons';
}

type Pending = 'block' | 'activate' | 'promote' | 'demote' | 'revoke' | null;

export function AdminUserActions({ user, variant = 'menu' }: AdminUserActionsProps) {
    const navigate = useNavigate();
    const { user: me } = useAuth();
    const [pending, setPending] = useState<Pending>(null);
    const [passwordFor, setPasswordFor] = useState<AdminUser | null>(null);
    const setStatus = useSetUserStatus();
    const setRole = useSetUserRole();
    const revoke = useRevokeUserSessions();

    const isSuperadmin = me?.role === 'superadmin';
    const isSelf = me?._id === user._id;
    const manageable = user.role !== 'superadmin' && !isSelf;
    const busy = setStatus.isPending || setRole.isPending || revoke.isPending;

    const run = async (fn: () => Promise<{ code: string }>) => {
        try {
            const { code } = await fn();
            toast.success(t(code));
            setPending(null);
        } catch (err) {
            toast.error(err instanceof ApiClientError ? err.message : 'No se pudo completar la acción.');
        }
    };

    const confirm = () => {
        const id = user._id;
        if (pending === 'block') return run(() => setStatus.mutateAsync({ id, status: 'blocked' }));
        if (pending === 'activate') return run(() => setStatus.mutateAsync({ id, status: 'active' }));
        if (pending === 'promote') return run(() => setRole.mutateAsync({ id, role: 'admin' }));
        if (pending === 'demote') return run(() => setRole.mutateAsync({ id, role: 'user' }));
        if (pending === 'revoke') return run(() => revoke.mutateAsync({ id }));
    };

    const CONFIRM: Record<
        NonNullable<Pending>,
        { title: string; description: string; label: string; destructive?: boolean }
    > = {
        block: {
            title: `¿Bloquear a ${user.name}?`,
            description:
                'No podrá iniciar sesión y se cerrarán sus sesiones abiertas. Sus intercambios no se modifican.',
            label: 'Bloquear',
            destructive: true,
        },
        activate: {
            title: `¿Activar a ${user.name}?`,
            description:
                user.status === 'pending'
                    ? 'La cuenta quedará verificada sin necesidad del email de confirmación.'
                    : 'Podrá volver a iniciar sesión.',
            label: 'Activar',
        },
        promote: {
            title: `¿Hacer administrador a ${user.name}?`,
            description: 'Podrá ver y gestionar todos los usuarios e intercambios. Tendrá que iniciar sesión de nuevo.',
            label: 'Hacer admin',
        },
        demote: {
            title: `¿Quitar el rol de administrador a ${user.name}?`,
            description: 'Volverá a ser un usuario normal. Tendrá que iniciar sesión de nuevo.',
            label: 'Quitar admin',
            destructive: true,
        },
        revoke: {
            title: `¿Cerrar todas las sesiones de ${user.name}?`,
            description: 'Tendrá que volver a iniciar sesión en todos sus dispositivos.',
            label: 'Cerrar sesiones',
        },
    };

    const items = (
        <>
            {variant === 'menu' && (
                <Item variant={variant} icon={Eye} onClick={() => navigate(`/admin/usuarios/${user._id}`)}>
                    Ver
                </Item>
            )}
            {user.role !== 'superadmin' && (
                <Item variant={variant} icon={KeyRound} onClick={() => setPasswordFor(user)}>
                    Contraseña temporal
                </Item>
            )}
            {manageable && (
                <>
                    {user.status === 'active' ? (
                        <Item variant={variant} icon={Ban} destructive onClick={() => setPending('block')}>
                            Bloquear
                        </Item>
                    ) : (
                        <Item variant={variant} icon={CircleCheck} onClick={() => setPending('activate')}>
                            Activar
                        </Item>
                    )}
                    {variant === 'buttons' && (
                        <Item variant={variant} icon={LogOut} onClick={() => setPending('revoke')}>
                            Cerrar sesiones
                        </Item>
                    )}
                    {isSuperadmin && (
                        <>
                            {variant === 'menu' && <DropdownMenuSeparator />}
                            {user.role === 'admin' ? (
                                <Item variant={variant} icon={ShieldOff} onClick={() => setPending('demote')}>
                                    Quitar admin
                                </Item>
                            ) : (
                                <Item variant={variant} icon={ShieldCheck} onClick={() => setPending('promote')}>
                                    Hacer admin
                                </Item>
                            )}
                        </>
                    )}
                </>
            )}
        </>
    );

    return (
        <>
            {variant === 'menu' ? (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Acciones de ${user.receptorNumber}`}>
                            <MoreHorizontal />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">{items}</DropdownMenuContent>
                </DropdownMenu>
            ) : (
                <div className="flex flex-wrap gap-2">{items}</div>
            )}

            {pending && (
                <ConfirmDialog
                    open
                    onOpenChange={(open) => !open && setPending(null)}
                    title={CONFIRM[pending].title}
                    description={CONFIRM[pending].description}
                    confirmLabel={CONFIRM[pending].label}
                    destructive={CONFIRM[pending].destructive}
                    loading={busy}
                    onConfirm={() => void confirm()}
                />
            )}
            <SetPasswordDialog user={passwordFor} onClose={() => setPasswordFor(null)} />
        </>
    );
}

function Item({
    variant,
    icon: Icon,
    destructive,
    onClick,
    children,
}: {
    variant: 'menu' | 'buttons';
    icon: typeof Eye;
    destructive?: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    if (variant === 'menu') {
        return (
            <DropdownMenuItem variant={destructive ? 'destructive' : 'default'} onClick={onClick}>
                <Icon /> {children}
            </DropdownMenuItem>
        );
    }
    return (
        <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClick}
            className={destructive ? 'text-destructive' : ''}
        >
            <Icon /> {children}
        </Button>
    );
}
