import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { LoginForm } from '@/features/auth/components/LoginForm';

export function LoginPage() {
    const [params] = useSearchParams();

    useEffect(() => {
        if (params.get('expired')) toast.warning('Tu sesión ha caducado. Inicia sesión de nuevo.', { id: 'expired' });
    }, [params]);

    return (
        <AuthCard
            title="Entrar"
            description="Accede con el email y la contraseña de tu administración."
            footer={
                <span>
                    ¿Aún no tienes cuenta?{' '}
                    <Link to="/registro" className="font-medium text-primary underline-offset-4 hover:underline">
                        Regístrate
                    </Link>
                </span>
            }
        >
            <LoginForm />
        </AuthCard>
    );
}
