import { useCallback, useEffect, useRef, useState } from 'react';
import { CameraOff, Loader2, ScanLine } from 'lucide-react';
import { toast } from 'sonner';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { decodeDecimo, describeScan, type DecimoDecodificado } from '@anapal/shared';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { t } from '@/lib/messages';

interface CameraScannerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onScan: (scan: DecimoDecodificado) => void;
}

/** Identical raw reads closer than this are one scan (the camera sees the same code many times). */
const DEBOUNCE_MS = 1500;
/** How often the native detector samples the video. */
const NATIVE_INTERVAL_MS = 180;

// Minimal typing for the Barcode Detection API (not in lib.dom yet).
interface DetectedBarcode {
    rawValue: string;
}
interface BarcodeDetectorLike {
    detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
}
interface BarcodeDetectorCtor {
    new (options?: { formats: string[] }): BarcodeDetectorLike;
    getSupportedFormats?: () => Promise<string[]>;
}
const nativeDetector = () => (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;

const ZXING_HINTS = new Map<DecodeHintType, unknown>([
    [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.ITF, BarcodeFormat.CODE_128, BarcodeFormat.EAN_13]],
    [DecodeHintType.TRY_HARDER, true],
]);

function beep() {
    try {
        const Ctx =
            window.AudioContext ??
            (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 1400;
        gain.gain.value = 0.08;
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.09);
        osc.onended = () => void ctx.close();
    } catch {
        // Audio is a nicety; never break the scan over it.
    }
}

const vibrate = () => navigator.vibrate?.(80);

type Status = 'starting' | 'scanning' | 'error';

/** getUserMedia errors that mean "there is a camera API, but this device/permission won't give us one". */
const CAMERA_ERRORS = new Set(['NotAllowedError', 'NotFoundError', 'NotReadableError', 'OverconstrainedError']);

/**
 * Reads décimo barcodes with the device camera (docs/03 §5.2). Uses the native `BarcodeDetector`
 * when the browser has it and falls back to ZXing otherwise. In "modo continuo" the dialog stays
 * open after a read so several décimos can be scanned in a row.
 */
export function CameraScannerDialog({ open, onOpenChange, onScan }: CameraScannerDialogProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
    const [continuous, setContinuous] = useState(false);
    const [status, setStatus] = useState<Status>('starting');
    const [error, setError] = useState<string | null>(null);
    const [engine, setEngine] = useState<'native' | 'zxing'>(() => (nativeDetector() ? 'native' : 'zxing'));
    const [reads, setReads] = useState<{ count: number; last: string | null }>({ count: 0, last: null });

    const continuousRef = useRef(continuous);
    continuousRef.current = continuous;
    const onScanRef = useRef(onScan);
    onScanRef.current = onScan;
    const lastRead = useRef<{ raw: string; at: number } | null>(null);

    const handleRaw = useCallback(
        (raw: string) => {
            const now = Date.now();
            if (lastRead.current && lastRead.current.raw === raw && now - lastRead.current.at < DEBOUNCE_MS) return;
            lastRead.current = { raw, at: now };

            const decoded = decodeDecimo(raw);
            if (!decoded) {
                toast.error(t('scan.unreadable'), { id: 'scan-unreadable' });
                return;
            }
            beep();
            vibrate();
            setReads((r) => ({ count: r.count + 1, last: describeScan(decoded) }));
            onScanRef.current(decoded);
            if (!continuousRef.current) onOpenChange(false);
        },
        [onOpenChange],
    );

    useEffect(() => {
        if (!open) return;
        const video = videoRef.current;
        if (!video) return;

        let cancelled = false;
        let stream: MediaStream | null = null;
        let controls: IScannerControls | null = null;
        let timer: ReturnType<typeof setInterval> | undefined;
        const stopStream = () => {
            stream?.getTracks().forEach((track) => track.stop());
            stream = null;
        };

        setStatus('starting');
        setError(null);
        lastRead.current = null;

        const constraints: MediaStreamConstraints = {
            video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: 'environment' } },
            audio: false,
        };

        const fail = (err: unknown) => {
            if (cancelled) return;
            const name = err instanceof Error ? err.name : '';
            const code = CAMERA_ERRORS.has(name) ? 'scan.camera_unavailable' : 'scan.camera_unsupported';
            setError(t(code));
            setStatus('error');
        };

        const refreshDevices = async () => {
            try {
                const all = await navigator.mediaDevices.enumerateDevices();
                if (!cancelled) setDevices(all.filter((d) => d.kind === 'videoinput'));
            } catch {
                // Device list is optional (no selector shown).
            }
        };

        const startNative = async () => {
            const Detector = nativeDetector();
            if (!Detector) throw new Error('unsupported');
            const detector = new Detector({ formats: ['itf', 'code_128', 'ean_13', 'code_39'] });
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            if (cancelled) return;
            video.srcObject = stream;
            await video.play();
            // Probe once: some browsers expose the API without a working backend. Fall back if so.
            await detector.detect(video);
            if (cancelled) return;
            setStatus('scanning');
            void refreshDevices();
            let busy = false;
            timer = setInterval(async () => {
                if (busy || video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) return;
                busy = true;
                try {
                    const codes = await detector.detect(video);
                    const hit = codes.find((c) => c.rawValue.replace(/\D/g, '').length >= 20) ?? codes[0];
                    if (hit) handleRaw(hit.rawValue);
                } catch {
                    // Transient frame errors are normal; keep sampling.
                } finally {
                    busy = false;
                }
            }, NATIVE_INTERVAL_MS);
        };

        const startZxing = async () => {
            const reader = new BrowserMultiFormatReader(ZXING_HINTS, { delayBetweenScanAttempts: 120 });
            controls = await reader.decodeFromConstraints(constraints, video, (result) => {
                if (result) handleRaw(result.getText());
            });
            if (cancelled) {
                controls.stop();
                return;
            }
            setStatus('scanning');
            void refreshDevices();
        };

        (async () => {
            if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
            if (engine === 'native') {
                try {
                    await startNative();
                    return;
                } catch (err) {
                    // Permission errors are final; anything else means the native path is unusable here.
                    if (err instanceof Error && CAMERA_ERRORS.has(err.name)) throw err;
                    stopStream();
                    if (!cancelled) setEngine('zxing');
                    return;
                }
            }
            await startZxing();
        })().catch(fail);

        return () => {
            cancelled = true;
            clearInterval(timer);
            controls?.stop();
            stopStream();
            video.srcObject = null;
        };
    }, [open, deviceId, engine, handleRaw]);

    // Reset the per-session counter when the dialog closes.
    useEffect(() => {
        if (!open) setReads({ count: 0, last: null });
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent data-scanner-dialog="" className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Escanear con la cámara</DialogTitle>
                    <DialogDescription>
                        Enfoca el código de barras del décimo. Se leerá el número, la serie y la fracción.
                    </DialogDescription>
                </DialogHeader>

                <div className="relative overflow-hidden rounded-md bg-black">
                    <video
                        ref={videoRef}
                        playsInline
                        muted
                        autoPlay
                        className="aspect-[4/3] w-full object-cover"
                        aria-label="Vista de la cámara"
                    />
                    {status === 'scanning' && (
                        <div className="pointer-events-none absolute inset-x-6 top-1/2 -translate-y-1/2">
                            <div className="h-20 rounded-md border-2 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                            <ScanLine className="absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-1/2 text-primary" />
                        </div>
                    )}
                    {status === 'starting' && (
                        <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-white">
                            <Loader2 className="size-4 animate-spin" /> Iniciando cámara…
                        </div>
                    )}
                    {status === 'error' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-white">
                            <CameraOff className="size-6" />
                            <p>{error}</p>
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    {devices.length > 1 && (
                        <div className="space-y-1.5">
                            <Label htmlFor="camera-device">Cámara</Label>
                            <Select value={deviceId ?? ''} onValueChange={(v) => setDeviceId(v || undefined)}>
                                <SelectTrigger id="camera-device" className="w-full">
                                    <SelectValue placeholder="Cámara predeterminada" />
                                </SelectTrigger>
                                <SelectContent>
                                    {devices.map((d, i) => (
                                        <SelectItem key={d.deviceId} value={d.deviceId}>
                                            {d.label || `Cámara ${i + 1}`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Switch id="camera-continuous" checked={continuous} onCheckedChange={setContinuous} />
                            <Label htmlFor="camera-continuous">Modo continuo</Label>
                        </div>
                        <span className="text-xs text-muted-foreground">
                            {engine === 'native' ? 'Lector del navegador' : 'Lector ZXing'}
                        </span>
                    </div>

                    <p className="text-xs text-muted-foreground" aria-live="polite">
                        {reads.count > 0
                            ? `${reads.count} ${reads.count === 1 ? 'lectura' : 'lecturas'} · última: ${reads.last}`
                            : continuous
                              ? 'La ventana seguirá abierta tras cada lectura.'
                              : 'La ventana se cerrará tras la primera lectura.'}
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
