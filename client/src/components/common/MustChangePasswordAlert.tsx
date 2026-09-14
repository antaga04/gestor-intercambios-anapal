import { Link, useLocation } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/hooks';

export function MustChangePasswordAlert() {
    const { user } = useAuth();
    const { pathname } = useLocation();
    if (!user?.mustChangePassword) return null;
    return (
        <Alert className="border-primary/50 bg-primary/5">
            <KeyRound />
            <AlertTitle>Estás usando una contraseña temporal</AlertTitle>
            <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span>Cámbiala por una tuya para seguir usando la aplicación con seguridad.</span>
                {pathname !== '/perfil' && (
                    <Button asChild size="sm" variant="outline">
                        <Link to="/perfil#password">Cambiar contraseña</Link>
                    </Button>
                )}
            </AlertDescription>
        </Alert>
    );
}
