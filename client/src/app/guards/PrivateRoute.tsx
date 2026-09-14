import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks';
import { FullPageLoader } from '@/components/common/FullPageLoader';

export function PrivateRoute() {
    const { status } = useAuth();
    const location = useLocation();

    useEffect(() => {
        if (status === 'anonymous') toast.warning('Inicia sesión para continuar.', { id: 'login-required' });
    }, [status]);

    if (status === 'loading') return <FullPageLoader />;
    if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    return <Outlet />;
}

/** Redirects logged-in users away from login/register. */
export function AnonymousOnly() {
    const { status } = useAuth();
    if (status === 'loading') return <FullPageLoader />;
    if (status === 'authenticated') return <Navigate to="/dashboard" replace />;
    return <Outlet />;
}
