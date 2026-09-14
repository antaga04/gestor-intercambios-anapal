import { useEffect, useState } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { AdminUser } from '@anapal/shared';
import { LIMITS } from '@anapal/shared';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useResetUserPassword } from '@/features/admin/hooks';
import { ApiClientError } from '@/lib/api';
import { t } from '@/lib/messages';
import { generateTemporaryPassword } from '@/lib/password';

interface SetPasswordDialogProps {
    user: AdminUser | null;
    onClose: () => void;
}

/** Sets a temporary password for a user (docs/07): generated or typed, with a copy button. */
export function SetPasswordDialog({ user, onClose }: SetPasswordDialogProps) {
    const [password, setPassword] = useState('');
    const [copied, setCopied] = useState(false);
    const [done, setDone] = useState(false);
    const reset = useResetUserPassword();

    useEffect(() => {
        if (user) {
            setPassword(generateTemporaryPassword());
            setCopied(false);
            setDone(false);
        }
    }, [user]);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(password);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('No se pudo copiar. Selecciona la contraseña y cópiala a mano.');
        }
    };

    const submit = async () => {
        if (!user) return;
        try {
            const { code } = await reset.mutateAsync({ id: user._id, body: { temporaryPassword: password } });
            toast.success(t(code));
            setDone(true);
        } catch (err) {
            toast.error(err instanceof ApiClientError ? err.message : 'No se pudo establecer la contraseña.');
        }
    };

    const valid = password.length >= LIMITS.adminTempPasswordMin && password.length <= LIMITS.passwordMax;

    return (
        <Dialog open={user !== null} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Contraseña temporal</DialogTitle>
                    <DialogDescription>
                        {user && (
                            <>
                                Para <strong>{user.name}</strong> (nº {user.receptorNumber}, {user.email}).
                            </>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-2">
                    <Label htmlFor="temp-password">Contraseña</Label>
                    <div className="flex gap-2">
                        <Input
                            id="temp-password"
                            className="font-mono"
                            value={password}
                            disabled={done}
                            autoComplete="off"
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label="Generar otra"
                            disabled={done}
                            onClick={() => setPassword(generateTemporaryPassword())}
                        >
                            <RefreshCw />
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label="Copiar"
                            onClick={() => void copy()}
                        >
                            {copied ? <Check className="text-emerald-600" /> : <Copy />}
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Mínimo {LIMITS.adminTempPasswordMin} caracteres. El usuario tendrá que cambiarla al entrar.
                    </p>
                </div>

                {done ? (
                    <Alert>
                        <Check />
                        <AlertTitle>Contraseña establecida</AlertTitle>
                        <AlertDescription>
                            Comunícasela al usuario por teléfono
                            {user?.phone ? ` (${user.phone})` : ''}. Sus sesiones abiertas se han cerrado.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <Alert>
                        <AlertTitle>No se envía ningún email</AlertTitle>
                        <AlertDescription>
                            Copia la contraseña antes de cerrar: no volverá a mostrarse.
                        </AlertDescription>
                    </Alert>
                )}

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>
                        {done ? 'Cerrar' : 'Cancelar'}
                    </Button>
                    {!done && (
                        <Button type="button" disabled={!valid || reset.isPending} onClick={() => void submit()}>
                            Establecer contraseña
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
