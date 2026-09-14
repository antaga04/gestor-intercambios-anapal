import { Link } from 'react-router-dom';
import { LogOut, UserRound } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { useAuth } from '@/features/auth/hooks';
import { useActiveCampaign } from '@/features/campaigns/hooks';

export function AppHeader() {
    const { user, logout } = useAuth();
    const { data: campaign } = useActiveCampaign();

    return (
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1 h-5" />
            {campaign && (
                <Badge variant="secondary" className="hidden sm:inline-flex">
                    {campaign.name}
                </Badge>
            )}
            <div className="ml-auto flex items-center gap-1">
                <ThemeToggle />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="max-w-56 gap-2">
                            <UserRound className="size-4" />
                            <span className="truncate">{user?.name}</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel className="font-normal">
                            <p className="truncate text-sm font-medium">{user?.name}</p>
                            <p className="truncate text-xs text-muted-foreground">Nº receptor {user?.receptorNumber}</p>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link to="/perfil">
                                <UserRound /> Perfil
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void logout()}>
                            <LogOut /> Cerrar sesión
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
