import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Eye, FileDown, MoreHorizontal, Pencil, Send, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import type { ExchangeSummary } from '@anapal/shared';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { RejectDialog } from '@/features/exchanges/components/RejectDialog';
import { useAcceptExchange, useCancelExchange, useDeleteExchange, useSendExchange } from '@/features/exchanges/hooks';
import { isAdminRole, useAuth } from '@/features/auth/hooks';
import { PdfPreviewDialog } from '@/features/pdf/PdfPreviewDialog';
import { useExchangePdf } from '@/features/pdf/hooks';
import { ApiClientError } from '@/lib/api';
import { t } from '@/lib/messages';

interface ExchangeActionsProps {
    exchange: ExchangeSummary;
    /** `menu` renders a dropdown (lists), `buttons` renders inline buttons (detail page). */
    variant?: 'menu' | 'buttons';
    onDeleted?: () => void;
}

export function ExchangeActions({ exchange, variant = 'menu', onDeleted }: ExchangeActionsProps) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [rejecting, setRejecting] = useState(false);
    const send = useSendExchange();
    const cancel = useCancelExchange();
    const accept = useAcceptExchange();
    const remove = useDeleteExchange();
    const pdf = useExchangePdf();

    const isSender = exchange.from._id === user?._id;
    const isReceiver = exchange.to._id === user?._id;
    // Admins may edit/delete any exchange (server bypass); they never send/accept on someone's behalf.
    const isAdminViewer = isAdminRole(user?.role) && !isSender && !isReceiver;
    const canEdit = isSender || isAdminViewer;
    const canSend = isSender && ['draft', 'rejected', 'cancelled'].includes(exchange.status) && exchange.rowCount > 0;
    const canCancel = isSender && exchange.status === 'pending';
    const canRespond = isReceiver && exchange.status === 'pending';

    const run = async (fn: () => Promise<{ code: string }>) => {
        try {
            const { code } = await fn();
            toast.success(t(code));
        } catch (err) {
            toast.error(err instanceof ApiClientError ? err.message : 'No se pudo completar la acción.');
        }
    };

    const onDelete = async () => {
        try {
            const { code } = await remove.mutateAsync(exchange._id);
            toast.success(t(code));
            setConfirmDelete(false);
            if (onDeleted) onDeleted();
            else navigate('/intercambios');
        } catch (err) {
            toast.error(err instanceof ApiClientError ? err.message : 'No se pudo eliminar.');
        }
    };

    const actions = (
        <>
            {canSend && (
                <ActionItem
                    variant={variant}
                    icon={Send}
                    onClick={() => void run(() => send.mutateAsync(exchange._id))}
                >
                    {exchange.status === 'draft' ? 'Enviar' : 'Enviar de nuevo'}
                </ActionItem>
            )}
            {canRespond && (
                <>
                    <ActionItem
                        variant={variant}
                        icon={Check}
                        onClick={() => void run(() => accept.mutateAsync(exchange._id))}
                    >
                        Aceptar
                    </ActionItem>
                    <ActionItem variant={variant} icon={X} secondary onClick={() => setRejecting(true)}>
                        Rechazar
                    </ActionItem>
                </>
            )}
            {canEdit && (
                <ActionItem
                    variant={variant}
                    icon={Pencil}
                    onClick={() => navigate(`/intercambios/${exchange._id}/editar`)}
                >
                    Editar
                </ActionItem>
            )}
            {canCancel && (
                <ActionItem
                    variant={variant}
                    icon={X}
                    secondary
                    onClick={() => void run(() => cancel.mutateAsync(exchange._id))}
                >
                    Cancelar envío
                </ActionItem>
            )}
            {(isSender || isAdminViewer) && (
                <>
                    {variant === 'menu' && <DropdownMenuSeparator />}
                    <ActionItem
                        variant={variant}
                        icon={Eye}
                        secondary
                        onClick={() => void pdf.previewExchange(exchange)}
                    >
                        Vista previa PDF
                    </ActionItem>
                    <ActionItem
                        variant={variant}
                        icon={FileDown}
                        secondary
                        onClick={() => void pdf.downloadExchange(exchange)}
                    >
                        Descargar PDF
                    </ActionItem>
                    {variant === 'menu' && <DropdownMenuSeparator />}
                    <ActionItem variant={variant} icon={Trash2} destructive onClick={() => setConfirmDelete(true)}>
                        Eliminar
                    </ActionItem>
                </>
            )}
        </>
    );

    return (
        <>
            {variant === 'menu' ? (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Acciones de ${exchange.to.receptorNumber}`}>
                            <MoreHorizontal />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/intercambios/${exchange._id}`)}>
                            Ver
                        </DropdownMenuItem>
                        {actions}
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : (
                <div className="flex flex-wrap gap-2">{actions}</div>
            )}

            <ConfirmDialog
                open={confirmDelete}
                onOpenChange={setConfirmDelete}
                title="¿Eliminar el intercambio?"
                description="Se borrará el sobre y su contenido. Esta acción no se puede deshacer."
                confirmLabel="Eliminar"
                destructive
                loading={remove.isPending}
                onConfirm={() => void onDelete()}
            />
            <RejectDialog open={rejecting} onOpenChange={setRejecting} exchangeId={exchange._id} />
            <PdfPreviewDialog preview={pdf.preview} onClose={pdf.closePreview} />
        </>
    );
}

function ActionItem({
    variant,
    icon: Icon,
    destructive,
    secondary,
    onClick,
    children,
}: {
    variant: 'menu' | 'buttons';
    icon: typeof Send;
    destructive?: boolean;
    /** Outline button in `buttons` mode (non-primary actions such as PDFs). */
    secondary?: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    if (variant === 'menu') {
        return (
            <DropdownMenuItem variant={destructive ? 'destructive' : 'default'} onClick={onClick}>
                <Icon /> {children}
            </DropdownMenuItem>
        );
    }
    return (
        <Button type="button" variant={destructive || secondary ? 'outline' : 'default'} size="sm" onClick={onClick}>
            <Icon /> {children}
        </Button>
    );
}
