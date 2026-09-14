import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck, MailWarning } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { RegisterForm } from '@/features/auth/components/RegisterForm';

export function RegisterPage() {
    const [result, setResult] = useState<{ email: string; emailSent: boolean } | null>(null);

    if (result) {
        return (
            <AuthCard title="Cuenta creada">
                <Alert>
                    {result.emailSent ? <MailCheck /> : <MailWarning />}
                    <AlertTitle>{result.emailSent ? 'Revisa tu correo' : 'No pudimos enviar el email'}</AlertTitle>
                    <AlertDescription>
                        {result.emailSent
                            ? `Te hemos enviado un email a ${result.email} con un enlace para verificar tu cuenta. Caduca en 24 horas.`
                            : `La cuenta ${result.email} se ha creado, pero el email de verificación no se pudo enviar. Puedes solicitar el reenvío.`}
                    </AlertDescription>
                </Alert>
                <div className="mt-6 flex flex-col gap-2">
                    <Button asChild variant={result.emailSent ? 'outline' : 'default'}>
                        <Link to="/reenviar-verificacion">Reenviar email de verificación</Link>
                    </Button>
                    <Button asChild variant="ghost">
                        <Link to="/login">Ir a entrar</Link>
                    </Button>
                </div>
            </AuthCard>
        );
    }

    return (
        <AuthCard
            title="Registrar administración"
            description="Crea la cuenta de tu administración para participar en el intercambio."
            wide
            footer={
                <span>
                    ¿Ya tienes cuenta?{' '}
                    <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
                        Entrar
                    </Link>
                </span>
            }
        >
            <RegisterForm onRegistered={setResult} />
        </AuthCard>
    );
}
