import { Link, Outlet } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/common/Logo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { useAuth } from '@/features/auth/hooks';

export function PublicLayout() {
    const { status } = useAuth();
    return (
        <div className="flex min-h-svh flex-col bg-background text-foreground">
            <header className="sticky top-0 z-10 border-b border-border/70 bg-background/80 backdrop-blur-md">
                <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
                    <Link to="/" className="flex items-center gap-2" aria-label="Inicio">
                        <Logo className="h-8" />
                        <span className="hidden font-heading text-sm font-bold tracking-tight sm:inline">
                            Intercambios
                        </span>
                    </Link>
                    <nav className="flex items-center gap-1">
                        <ThemeToggle />
                        {status === 'authenticated' ? (
                            <Button asChild size="sm">
                                <Link to="/dashboard">Ir al panel</Link>
                            </Button>
                        ) : (
                            <>
                                <Button asChild variant="ghost" size="sm">
                                    <Link to="/login">Entrar</Link>
                                </Button>
                                <Button asChild size="sm">
                                    <Link to="/registro">Registrarse</Link>
                                </Button>
                            </>
                        )}
                    </nav>
                </div>
            </header>
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
                <Outlet />
            </main>
            <footer className="border-t py-6 text-center text-xs text-muted-foreground">
                <p>
                    © {new Date().getFullYear()} ANAPAL ·{' '}
                    <Link to="/aviso-legal" className="underline-offset-4 hover:underline">
                        Aviso legal
                    </Link>
                </p>
            </footer>
        </div>
    );
}
