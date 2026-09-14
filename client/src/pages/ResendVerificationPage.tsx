import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { authApi } from '@/features/auth/api';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { EmailOnlyForm } from '@/features/auth/components/EmailOnlyForm';
import { t } from '@/lib/messages';

export function ResendVerificationPage() {
    return (
        <AuthCard
            title="Reenviar verificación"
            description="Te enviaremos un nuevo enlace si la cuenta existe y está pendiente de verificar. Máximo 3 envíos al día."
            footer={
                <Link to="/login" className="underline-offset-4 hover:underline">
                    Volver a entrar
                </Link>
            }
        >
            <EmailOnlyForm
                submitLabel="Reenviar email"
                onSubmit={async (values) => {
                    const { code } = await authApi.resendVerification(values);
                    toast.success(t(code));
                }}
            />
        </AuthCard>
    );
}
