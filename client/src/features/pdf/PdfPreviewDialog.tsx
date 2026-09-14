import { useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { downloadPdf } from '@/features/pdf/download';

export interface PdfPreview {
    title: string;
    filename: string;
    /** `null` while the document is still being generated. */
    bytes: Uint8Array | null;
}

interface PdfPreviewDialogProps {
    preview: PdfPreview | null;
    onClose: () => void;
}

/** Shows a generated PDF in an iframe with a download button. */
export function PdfPreviewDialog({ preview, onClose }: PdfPreviewDialogProps) {
    const [url, setUrl] = useState<string | null>(null);
    const bytes = preview?.bytes ?? null;

    useEffect(() => {
        if (!bytes) {
            setUrl(null);
            return;
        }
        const objectUrl = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
        setUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [bytes]);

    return (
        <Dialog open={preview !== null} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="flex h-[90vh] max-w-[calc(100%-2rem)] flex-col sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>{preview?.title ?? 'Vista previa'}</DialogTitle>
                    <DialogDescription>
                        Comprueba el sobre antes de imprimirlo. Imprime sin ajustar a la página para que el texto caiga
                        en las casillas.
                    </DialogDescription>
                </DialogHeader>
                <div className="min-h-0 flex-1 overflow-hidden rounded-md border bg-muted">
                    {url ? (
                        <iframe src={url} title={preview?.title ?? 'PDF'} className="size-full" />
                    ) : (
                        <div className="flex size-full items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="size-4 animate-spin" /> Generando PDF…
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cerrar
                    </Button>
                    <Button
                        type="button"
                        disabled={!bytes}
                        onClick={() => preview && bytes && downloadPdf(bytes, preview.filename)}
                    >
                        <Download /> Descargar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
