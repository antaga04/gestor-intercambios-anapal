import { Link, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    useSidebar,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/common/Logo';
import { useAuth } from '@/features/auth/hooks';
import { useActiveCampaign } from '@/features/campaigns/hooks';
import { useDashboard } from '@/features/dashboard/hooks';
import { ADMIN_NAV, MAIN_NAV, type NavItem } from '@/lib/constants';

function NavEntry({ item, badge }: { item: NavItem; badge?: number }) {
    const { isMobile, setOpenMobile } = useSidebar();
    const { pathname } = useLocation();
    const exact = item.to === '/admin';
    const isActive = exact ? pathname === item.to : pathname === item.to || pathname.startsWith(item.to + '/');
    return (
        <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                <Link to={item.to} onClick={() => isMobile && setOpenMobile(false)}>
                    <item.icon />
                    <span>{item.title}</span>
                </Link>
            </SidebarMenuButton>
            {badge ? <SidebarMenuBadge className="bg-primary text-primary-foreground">{badge}</SidebarMenuBadge> : null}
        </SidebarMenuItem>
    );
}

export function AppSidebar() {
    const { user, logout } = useAuth();
    const { data: campaign } = useActiveCampaign();
    const { data: dashboard } = useDashboard();
    const inboxCount = dashboard?.inboxPending ?? 0;
    const adminItems = ADMIN_NAV.filter((i) => user && (user.role === 'superadmin' || i.roles.includes(user.role)));

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <Link
                    to="/dashboard"
                    className="flex items-center gap-2 px-1 py-1 group-data-[collapsible=icon]:justify-center"
                >
                    <Logo className="h-7 shrink-0" />
                    <span className="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">
                        Intercambios
                    </span>
                </Link>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {MAIN_NAV.map((item) => (
                                <NavEntry key={item.to} item={item} badge={item.inboxBadge ? inboxCount : undefined} />
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                {adminItems.length > 0 && (
                    <SidebarGroup>
                        <SidebarGroupLabel>Administración</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {adminItems.map((item) => (
                                    <NavEntry key={item.to} item={item} />
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                )}
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton onClick={() => void logout()} tooltip="Cerrar sesión">
                            <LogOut />
                            <span>Cerrar sesión</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                <p className="truncate px-2 text-[11px] text-muted-foreground group-data-[collapsible=icon]:hidden">
                    {campaign ? campaign.name : 'Sin campaña activa'}
                </p>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
