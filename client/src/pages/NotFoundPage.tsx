import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/common/Logo';
import { useAuth } from '@/features/auth/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function NotFoundPage() {
    useDocumentTitle('Página no encontrada');
    const { status } = useAuth();
    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-6 text-center">
            <Logo className="h-12" />
            <h1 className="text-2xl font-semibold">Página no encontrada</h1>
            <p className="text-sm text-muted-foreground">La dirección que has abierto no existe.</p>
            <Button asChild>
                <Link to={status === 'authenticated' ? '/dashboard' : '/'}>Volver al inicio</Link>
            </Button>
        </div>
    );
}
