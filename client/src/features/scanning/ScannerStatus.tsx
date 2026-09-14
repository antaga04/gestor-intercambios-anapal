import { useEffect, useState } from 'react';
import { Camera, ScanBarcode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ScannerStatusProps {
    /** Timestamp of the last accepted hardware scan; drives the pulse. */
    lastScanAt: number | null;
    onOpenCamera: () => void;
    className?: string;
}

/** "Escáner listo" indicator for the keyboard-wedge listener plus the camera entry point. */
export function ScannerStatus({ lastScanAt, onOpenCamera, className }: ScannerStatusProps) {
    const [pulsing, setPulsing] = useState(false);

    useEffect(() => {
        if (lastScanAt === null) return;
        setPulsing(true);
        const timer = setTimeout(() => setPulsing(false), 900);
        return () => clearTimeout(timer);
    }, [lastScanAt]);

    return (
        <div className={cn('flex flex-wrap items-center justify-between gap-2', className)}>
            <div className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
                <span className="relative flex size-2.5">
                    {pulsing && (
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                    )}
                    <span
                        className={cn(
                            'relative inline-flex size-2.5 rounded-full transition-colors',
                            pulsing ? 'bg-primary' : 'bg-emerald-500',
                        )}
                    />
                </span>
                <ScanBarcode className="size-3.5" />
                <span>{pulsing ? 'Código leído' : 'Escáner listo — escanea un décimo'}</span>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={onOpenCamera}>
                <Camera /> Cámara
            </Button>
        </div>
    );
}
