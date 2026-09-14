import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CircleCheck, CircleX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { authApi } from '@/features/auth/api';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { ApiClientError } from '@/lib/api';
import { t } from '@/lib/messages';

type State =
    { kind: 'loading' } | { kind: 'ok'; message: string } | { kind: 'error'; message: string; expired: boolean };

export function VerifyEmailPage() {
    const [params] = useSearchParams();
    const token = params.get('token');
    const [state, setState] = useState<State>({ kind: 'loading' });

    useEffect(() => {
        if (!token) {
            setState({ kind: 'error', message: t('auth.token_invalid'), expired: false });
            return;
        }
        let cancelled = false;
        authApi
            .verifyEmail(token)
            .then(({ code }) => !cancelled && setState({ kind: 'ok', message: t(code) }))
            .catch((err: unknown) => {
                if (cancelled) return;
                const code = err instanceof ApiClientError ? err.code : 'server.error';
                setState({ kind: 'error', message: t(code), expired: code === 'auth.token_expired' });
            });
        return () => {
            cancelled = true;
        };
    }, [token]);

    return (
        <AuthCard title="Verificación de cuenta">
            <div className="flex flex-col items-center gap-4 text-center">
                {state.kind === 'loading' && <Loader2 className="size-8 animate-spin text-primary" />}
                {state.kind === 'ok' && <CircleCheck className="size-10 text-green-600" />}
                {state.kind === 'error' && <CircleX className="size-10 text-destructive" />}
                <p className="text-sm">{state.kind === 'loading' ? 'Verificando…' : state.message}</p>
                {state.kind === 'ok' && (
                    <Button asChild className="w-full">
                        <Link to="/login">Ir a entrar</Link>
                    </Button>
                )}
                {state.kind === 'error' && (
                    <Button asChild variant={state.expired ? 'default' : 'outline'} className="w-full">
                        <Link to="/reenviar-verificacion">Solicitar un nuevo enlace</Link>
                    </Button>
                )}
            </div>
        </AuthCard>
    );
}
