import { useMemo, useRef, useState } from 'react';
import { AlertTriangle, FileUp, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { LIMITS, formatSeries, parseLotteryList, type LotteryParseResult } from '@anapal/shared';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useImportLottery } from '@/features/lottery/hooks';
import { ApiClientError } from '@/lib/api';
import { formatInt } from '@/lib/format';
import { t } from '@/lib/messages';

const EMPTY: LotteryParseResult = { rows: [], issues: [], mergedCount: 0 };
const PREVIEW_ROWS = 50;

interface LotteryImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentCount: number;
}

export function LotteryImportDialog({ open, onOpenChange, currentCount }: LotteryImportDialogProps) {
    const [text, setText] = useState('');
    const [replace, setReplace] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);
    const importMutation = useImportLottery();

    const parsed = useMemo(() => (text.trim() ? parseLotteryList(text) : EMPTY), [text]);
    const tooMany = currentCount + parsed.rows.length > LIMITS.lotteryNumbersPerUser && !replace;

    const reset = () => {
        setText('');
        setFileName(null);
        setReplace(false);
        setProgress(null);
        if (fileInput.current) fileInput.current.value = '';
    };

    const onFile = async (file: File) => {
        setFileName(file.name);
        setText(await file.text());
    };

    const onImport = async () => {
        const chunks: (typeof parsed.rows)[] = [];
        for (let i = 0; i < parsed.rows.length; i += LIMITS.lotteryImportChunk) {
            chunks.push(parsed.rows.slice(i, i + LIMITS.lotteryImportChunk));
        }
        try {
            let total = 0;
            for (const [index, chunk] of chunks.entries()) {
                setProgress({ done: index, total: chunks.length });
                const { payload } = await importMutation.mutateAsync({
                    rows: chunk.map(({ numero, series }) => ({ numero, series: series.length ? series : undefined })),
                    // Only the first chunk replaces, otherwise each chunk would wipe the previous one.
                    replace: replace && index === 0,
                });
                total = payload.total;
            }
            toast.success(`${t('lottery.imported')} Ahora tienes ${formatInt(total)} números.`);
            reset();
            onOpenChange(false);
        } catch (err) {
            toast.error(err instanceof ApiClientError ? err.message : 'No se pudo importar la lista.');
        } finally {
            setProgress(null);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next) reset();
                onOpenChange(next);
            }}
        >
            <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Importar lotería</DialogTitle>
                    <DialogDescription>
                        Un número por línea. Puedes añadir las series: <code>12345;40;74</code>. Valen <code>;</code>,
                        comas, tabulaciones o espacios. Los números de menos de 5 cifras se completan con ceros.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Button type="button" variant="outline" onClick={() => fileInput.current?.click()}>
                            <FileUp /> Elegir archivo (.csv o .txt)
                        </Button>
                        {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
                        <input
                            ref={fileInput}
                            type="file"
                            accept=".csv,.txt,text/csv,text/plain"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) void onFile(file);
                            }}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="lottery-text">O pega aquí tu lista</Label>
                        <Textarea
                            id="lottery-text"
                            rows={6}
                            className="font-mono text-sm"
                            placeholder={'12345;40;74\n00007\n54321;1;10'}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                        />
                    </div>

                    {parsed.rows.length > 0 && (
                        <>
                            <p className="text-sm text-muted-foreground">
                                <strong className="text-foreground">{formatInt(parsed.rows.length)}</strong>{' '}
                                {parsed.rows.length === 1 ? 'número' : 'números'} listos para importar
                                {parsed.mergedCount > 0 && ` · ${parsed.mergedCount} línea(s) repetidas se han unido`}
                                {parsed.rows.length > PREVIEW_ROWS && ` · se muestran los ${PREVIEW_ROWS} primeros`}
                            </p>
                            <div className="max-h-56 overflow-y-auto rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-32">Número</TableHead>
                                            <TableHead>Series</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {parsed.rows.slice(0, PREVIEW_ROWS).map((row) => (
                                            <TableRow key={row.numero}>
                                                <TableCell className="font-mono">{row.numero}</TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {row.series.length
                                                        ? formatSeries(row.series)
                                                        : 'Todas / sin especificar'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </>
                    )}

                    {parsed.issues.length > 0 && (
                        <Alert variant="destructive">
                            <AlertTriangle />
                            <AlertTitle>
                                {parsed.issues.length} {parsed.issues.length === 1 ? 'línea' : 'líneas'} con errores (se
                                ignorarán)
                            </AlertTitle>
                            <AlertDescription>
                                <ul className="max-h-24 list-disc space-y-0.5 overflow-y-auto pl-4 text-xs">
                                    {parsed.issues.slice(0, 20).map((issue) => (
                                        <li key={issue.line}>
                                            Línea {issue.line}: «{issue.raw}» — {issue.message}
                                        </li>
                                    ))}
                                </ul>
                            </AlertDescription>
                        </Alert>
                    )}

                    {tooMany && (
                        <Alert variant="destructive">
                            <AlertTriangle />
                            <AlertTitle>Demasiados números</AlertTitle>
                            <AlertDescription>
                                El máximo por campaña es {formatInt(LIMITS.lotteryNumbersPerUser)}.
                            </AlertDescription>
                        </Alert>
                    )}

                    {currentCount > 0 && (
                        <div className="flex items-start gap-3 rounded-md border p-3">
                            <Checkbox
                                id="replace"
                                checked={replace}
                                onCheckedChange={(v) => setReplace(v === true)}
                                className="mt-0.5"
                            />
                            <div className="space-y-0.5">
                                <Label htmlFor="replace">Reemplazar la lista actual</Label>
                                <p className="text-xs text-muted-foreground">
                                    Si no lo marcas, los números nuevos se añaden y las series se combinan con las que
                                    ya tienes.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={() => void onImport()}
                        disabled={parsed.rows.length === 0 || tooMany || !!progress}
                    >
                        {progress ? <Loader2 className="animate-spin" /> : <Upload />}
                        {progress
                            ? `Importando ${progress.done + 1}/${progress.total}…`
                            : `Importar ${formatInt(parsed.rows.length)} números`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
