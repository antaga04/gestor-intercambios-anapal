import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, Plus, X } from 'lucide-react';
import { LIMITS, rowSeries, validateRow } from '@anapal/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RowTypeSelect } from '@/features/exchanges/components/RowTypeSelect';
import {
    derivedQuantity,
    draftToRow,
    emptyDraft,
    parseNumberInput,
    type RowDraft,
} from '@/features/exchanges/rowDraft';
import { LOTTERY_WARNING_TEXT, useLotteryCheck } from '@/features/lottery/hooks';
import { cn } from '@/lib/utils';

interface RowEditorProps {
    draft: RowDraft;
    onChange: (draft: RowDraft) => void;
    onCommit: (draft: RowDraft) => void;
    onCancelEdit?: () => void;
    editing: boolean;
}

function Field({
    label,
    htmlFor,
    className,
    children,
    error,
}: {
    label: string;
    htmlFor: string;
    className?: string;
    children: React.ReactNode;
    error?: string;
}) {
    return (
        <div className={cn('space-y-1.5', className)}>
            <Label htmlFor={htmlFor}>{label}</Label>
            {children}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}

export function RowEditor({ draft, onChange, onCommit, onCancelEdit, editing }: RowEditorProps) {
    const [touched, setTouched] = useState(false);
    const numeroRef = useRef<HTMLInputElement>(null);
    const checkLottery = useLotteryCheck();

    const row = useMemo(() => draftToRow(draft), [draft]);
    const issues = useMemo(() => validateRow(row), [row]);
    const issueFor = (path: string) => issues.find((i) => i.path === path)?.message;
    const canCommit = issues.length === 0 && draft.numero.length === 5;

    const warning = useMemo(() => {
        if (draft.numero.length !== 5) return null;
        return checkLottery(draft.numero, rowSeries(row));
        // checkLottery is recreated on every render of the cached list; depend on its inputs instead.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draft.numero, row]);

    const derived = derivedQuantity(draft);
    useEffect(() => {
        if (derived !== null && derived !== draft.quantity) onChange({ ...draft, quantity: derived });
    }, [derived, draft, onChange]);

    const set = (patch: Partial<RowDraft>) => onChange({ ...draft, ...patch });

    const commit = () => {
        setTouched(true);
        if (!canCommit) return;
        onCommit(draft);
        setTouched(false);
        numeroRef.current?.focus();
    };

    // Once the número is complete the user is meaningfully into the row: explain what is missing
    // instead of silently disabling the button.
    const showIssues = touched || editing || draft.numero.length === 5;

    return (
        <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <RowTypeSelect
                    value={draft.type}
                    onChange={(type) =>
                        onChange({ ...emptyDraft(type), key: draft.key, numero: draft.numero, signed: draft.signed })
                    }
                />
                {editing && (
                    <Button type="button" variant="ghost" size="sm" onClick={onCancelEdit}>
                        <X /> Cancelar edición
                    </Button>
                )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Número" htmlFor="row-numero" error={showIssues ? issueFor('numero') : undefined}>
                    <Input
                        id="row-numero"
                        ref={numeroRef}
                        inputMode="numeric"
                        maxLength={5}
                        placeholder="12345"
                        className="font-mono text-base"
                        value={draft.numero}
                        onChange={(e) => set({ numero: e.target.value.replace(/\D/g, '').slice(0, 5) })}
                        onBlur={(e) => e.target.value && set({ numero: e.target.value.padStart(5, '0') })}
                    />
                </Field>

                {draft.type === 'billete' && (
                    <>
                        <Field
                            label="Serie desde"
                            htmlFor="row-serie-from"
                            error={showIssues ? issueFor('details.serieFrom') : undefined}
                        >
                            <Input
                                id="row-serie-from"
                                inputMode="numeric"
                                placeholder="opcional"
                                value={draft.serieFrom ?? ''}
                                onChange={(e) => set({ serieFrom: parseNumberInput(e.target.value) })}
                            />
                        </Field>
                        <Field
                            label="Serie hasta"
                            htmlFor="row-serie-to"
                            error={showIssues ? issueFor('details.serieTo') : undefined}
                        >
                            <Input
                                id="row-serie-to"
                                inputMode="numeric"
                                placeholder="opcional"
                                value={draft.serieTo ?? ''}
                                onChange={(e) => set({ serieTo: parseNumberInput(e.target.value) })}
                            />
                        </Field>
                        <Field
                            label="Billetes"
                            htmlFor="row-quantity"
                            error={showIssues ? issueFor('quantity') : undefined}
                        >
                            <Input
                                id="row-quantity"
                                inputMode="numeric"
                                value={draft.quantity}
                                disabled={derived !== null}
                                onChange={(e) => set({ quantity: parseNumberInput(e.target.value) ?? 0 })}
                            />
                        </Field>
                    </>
                )}

                {draft.type === 'decimo' && (
                    <>
                        <Field
                            label="Serie"
                            htmlFor="row-serie"
                            error={showIssues ? issueFor('details.serie') : undefined}
                        >
                            <Input
                                id="row-serie"
                                inputMode="numeric"
                                placeholder="opcional"
                                value={draft.serie ?? ''}
                                onChange={(e) => set({ serie: parseNumberInput(e.target.value) })}
                            />
                        </Field>
                        <Field
                            label="Fracción"
                            htmlFor="row-fraccion"
                            error={showIssues ? issueFor('details.fraccion') : undefined}
                        >
                            <Input
                                id="row-fraccion"
                                inputMode="numeric"
                                placeholder="opcional"
                                value={draft.fraccion ?? ''}
                                onChange={(e) => set({ fraccion: parseNumberInput(e.target.value) })}
                            />
                        </Field>
                    </>
                )}

                {draft.type === 'decimos' && (
                    <>
                        <DecimosItemsField
                            draft={draft}
                            onChange={onChange}
                            error={showIssues ? issueFor('details.items') : undefined}
                        />
                        <Field
                            label="Décimos"
                            htmlFor="row-quantity"
                            error={showIssues ? issueFor('quantity') : undefined}
                        >
                            <Input
                                id="row-quantity"
                                inputMode="numeric"
                                value={draft.quantity}
                                disabled={derived !== null}
                                onChange={(e) => set({ quantity: parseNumberInput(e.target.value) ?? 0 })}
                            />
                        </Field>
                    </>
                )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Checkbox
                        id="row-signed"
                        checked={draft.signed}
                        onCheckedChange={(v) => set({ signed: v === true })}
                    />
                    <Label htmlFor="row-signed">Firmado</Label>
                </div>
                <div className="flex items-center gap-2">
                    {warning && (
                        <Badge
                            variant="outline"
                            className="gap-1 border-amber-500/50 text-amber-700 dark:text-amber-400"
                        >
                            <AlertTriangle className="size-3" /> {LOTTERY_WARNING_TEXT[warning]}
                        </Badge>
                    )}
                    <Button type="button" onClick={commit} disabled={!canCommit}>
                        {editing ? <Check /> : <Plus />} {editing ? 'Guardar fila' : 'Añadir fila'}
                    </Button>
                </div>
            </div>

            {showIssues && issues.length > 0 && (
                <ul className="list-disc space-y-0.5 pl-5 text-xs text-destructive">
                    {issues.map((issue) => (
                        <li key={issue.path + issue.code}>{issue.message}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function DecimosItemsField({
    draft,
    onChange,
    error,
}: {
    draft: RowDraft;
    onChange: (draft: RowDraft) => void;
    error?: string;
}) {
    const [serie, setSerie] = useState('');
    const [fraccion, setFraccion] = useState('');

    const add = () => {
        const s = parseNumberInput(serie);
        const f = parseNumberInput(fraccion);
        if (s === undefined || f === undefined) return;
        if (draft.items.some((i) => i.serie === s && i.fraccion === f)) return;
        onChange({ ...draft, items: [...draft.items, { serie: s, fraccion: f }] });
        setSerie('');
        setFraccion('');
    };

    return (
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
            <Label htmlFor="row-item-serie">Décimos (serie / fracción)</Label>
            <div className="flex flex-wrap items-center gap-2">
                <Input
                    id="row-item-serie"
                    className="w-24"
                    inputMode="numeric"
                    placeholder="serie"
                    value={serie}
                    onChange={(e) => setSerie(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
                />
                <Input
                    className="w-24"
                    inputMode="numeric"
                    placeholder="fracción"
                    value={fraccion}
                    onChange={(e) => setFraccion(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
                />
                <Button type="button" variant="outline" size="sm" onClick={add} disabled={!serie || !fraccion}>
                    <Plus /> Añadir
                </Button>
            </div>
            {draft.items.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                    {draft.items.map((item, index) => (
                        <Badge key={`${item.serie}-${item.fraccion}`} variant="secondary" className="gap-1 font-mono">
                            {item.serie}/{item.fraccion}
                            <button
                                type="button"
                                aria-label={`Quitar serie ${item.serie} fracción ${item.fraccion}`}
                                onClick={() => onChange({ ...draft, items: draft.items.filter((_, i) => i !== index) })}
                                className="ml-0.5 text-muted-foreground hover:text-foreground"
                            >
                                <X className="size-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}
            <p className="text-xs text-muted-foreground">
                Opcional: sin detalle solo se guarda la cantidad (máx. {LIMITS.decimosMax}).
            </p>
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}
