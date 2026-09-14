import { useState } from 'react';
import { toast } from 'sonner';
import { LIMITS } from '@anapal/shared';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRejectExchange } from '@/features/exchanges/hooks';
import { ApiClientError } from '@/lib/api';
import { t } from '@/lib/messages';

interface RejectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    exchangeId: string;
}

export function RejectDialog({ open, onOpenChange, exchangeId }: RejectDialogProps) {
    const [reason, setReason] = useState('');
    const reject = useRejectExchange();

    const submit = async () => {
        try {
            const { code } = await reject.mutateAsync({ id: exchangeId, reason: reason.trim() || undefined });
            toast.success(t(code));
            setReason('');
            onOpenChange(false);
        } catch (err) {
            toast.error(err instanceof ApiClientError ? err.message : 'No se pudo rechazar.');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Rechazar el intercambio</DialogTitle>
                    <DialogDescription>
                        La otra administración verá que lo has rechazado y podrá modificarlo y volver a enviarlo.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-1.5">
                    <Label htmlFor="reject-reason">Motivo (opcional)</Label>
                    <Textarea
                        id="reject-reason"
                        rows={3}
                        maxLength={LIMITS.rejectReasonMax}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Por ejemplo: ya tengo ese número"
                    />
                </div>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        disabled={reject.isPending}
                        onClick={() => void submit()}
                    >
                        Rechazar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
