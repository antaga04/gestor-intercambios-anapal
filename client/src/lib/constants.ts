import type { LucideIcon } from 'lucide-react';
import {
    ArrowLeftRight,
    CalendarRange,
    ClipboardList,
    History,
    KeyRound,
    LayoutDashboard,
    ShieldCheck,
    Ticket,
    UserRound,
    Users,
} from 'lucide-react';
import type { Role } from '@anapal/shared';

export interface NavItem {
    title: string;
    to: string;
    icon: LucideIcon;
    /** Show the pending-inbox badge on this item. */
    inboxBadge?: boolean;
    /** Show the pending password-requests badge (admins). */
    requestsBadge?: boolean;
    /** Only shown to users with records imported from the previous app. */
    legacyOnly?: boolean;
}

export const MAIN_NAV: NavItem[] = [
    { title: 'Inicio', to: '/dashboard', icon: LayoutDashboard },
    { title: 'Intercambios', to: '/intercambios', icon: ArrowLeftRight, inboxBadge: true },
    { title: 'Mi lotería', to: '/mi-loteria', icon: Ticket },
    { title: 'Lista de control', to: '/lista-control', icon: ClipboardList },
    { title: 'Histórico', to: '/historico', icon: History, legacyOnly: true },
    { title: 'Perfil', to: '/perfil', icon: UserRound },
];

export const ADMIN_NAV: (NavItem & { roles: Role[] })[] = [
    { title: 'Panel', to: '/admin', icon: ShieldCheck, roles: ['admin', 'superadmin'] },
    { title: 'Usuarios', to: '/admin/usuarios', icon: Users, roles: ['admin', 'superadmin'] },
    {
        title: 'Solicitudes',
        to: '/admin/solicitudes',
        icon: KeyRound,
        roles: ['admin', 'superadmin'],
        requestsBadge: true,
    },
    { title: 'Campañas', to: '/admin/campanas', icon: CalendarRange, roles: ['superadmin'] },
];

export const APP_NAME = 'Intercambios ANAPAL';
