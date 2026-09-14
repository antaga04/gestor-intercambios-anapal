import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { authApi } from '@/features/auth/api';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { EmailOnlyForm } from '@/features/auth/components/EmailOnlyForm';
import { t } from '@/lib/messages';

export function ForgotPasswordPage() {
    const [done, setDone] = useState<string | null>(null);

    return (
        <AuthCard
            title="He olvidado mi contraseña"
            description="Por seguridad no enviamos emails de recuperación: un administrador de ANAPAL te asignará una contraseña temporal y se pondrá en contacto contigo."
            footer={
                <Link to="/login" className="underline-offset-4 hover:underline">
                    Volver a entrar
                </Link>
            }
        >
            {done ? (
                <Alert>
                    <Info />
                    <AlertTitle>Solicitud enviada</AlertTitle>
                    <AlertDescription>{done}</AlertDescription>
                </Alert>
            ) : (
                <EmailOnlyForm
                    submitLabel="Solicitar contraseña temporal"
                    onSubmit={async (values) => {
                        const { code } = await authApi.forgotPassword(values);
                        setDone(t(code));
                    }}
                />
            )}
        </AuthCard>
    );
}
