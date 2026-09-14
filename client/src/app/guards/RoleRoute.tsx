import { Navigate, Outlet } from 'react-router-dom';
import type { Role } from '@anapal/shared';
import { useAuth } from '@/features/auth/hooks';

export function RoleRoute({ roles }: { roles: Role[] }) {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    if (user.role !== 'superadmin' && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
    return <Outlet />;
}
