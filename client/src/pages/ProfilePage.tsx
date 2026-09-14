import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/PageHeader';
import { MustChangePasswordAlert } from '@/components/common/MustChangePasswordAlert';
import { useAuth } from '@/features/auth/hooks';
import { ProfileForm } from '@/features/users/components/ProfileForm';
import { ChangePasswordForm } from '@/features/users/components/ChangePasswordForm';
import { cn } from '@/lib/utils';

export function ProfilePage() {
    const { user } = useAuth();
    if (!user) return null;
    return (
        <>
            <PageHeader title="Perfil" description={user.email} />
            <MustChangePasswordAlert />
            <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
                <Card>
                    <CardHeader>
                        <CardTitle>Datos de la administración</CardTitle>
                        <CardDescription>
                            Estos datos los verán otras administraciones y se imprimen en los sobres.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ProfileForm user={user} />
                    </CardContent>
                </Card>
                <Card id="password" className={cn(user.mustChangePassword && 'border-primary')}>
                    <CardHeader>
                        <CardTitle>Cambiar contraseña</CardTitle>
                        <CardDescription>Al cambiarla se cerrarán tus sesiones en otros dispositivos.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChangePasswordForm />
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
