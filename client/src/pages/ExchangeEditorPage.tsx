import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Info, Loader2, Save, Send } from 'lucide-react';
import { toast } from 'sonner';
import type { PublicUser } from '@anapal/shared';
import { exchangeTotalDecimos } from '@anapal/shared';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { UserCard } from '@/components/common/UserCard';
import { RowEditor } from '@/features/exchanges/components/RowEditor';
import { RowTable } from '@/features/exchanges/components/RowTable';
import { ExchangeTotals } from '@/features/exchanges/components/ExchangeTotals';
import { useCreateExchange, useExchange, useUpdateExchange } from '@/features/exchanges/hooks';
import { UserPicker } from '@/features/users/components/UserPicker';
import { draftFromRow, draftToRow, emptyDraft, type RowDraft } from '@/features/exchanges/rowDraft';
import { ApiClientError } from '@/lib/api';
import { t } from '@/lib/messages';

export function ExchangeEditorPage({ mode }: { mode: 'create' | 'edit' }) {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEdit = mode === 'edit';
    const { data: exchange, isLoading } = useExchange(isEdit ? id : undefined);

    const [counterpart, setCounterpart] = useState<PublicUser | null>(null);
    const [rows, setRows] = useState<RowDraft[]>([]);
    const [draft, setDraft] = useState<RowDraft>(() => emptyDraft('billete'));
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [note, setNote] = useState('');
    const [existingId, setExistingId] = useState<string | null>(null);

    const create = useCreateExchange();
    const update = useUpdateExchange();
    const busy = create.isPending || update.isPending;

    useEffect(() => {
        if (!exchange) return;
        setCounterpart(exchange.to);
        setRows(exchange.rows.map(draftFromRow));
        setNote(exchange.note ?? '');
    }, [exchange]);

    const totalDecimos = useMemo(() => exchangeTotalDecimos(rows.map(draftToRow)), [rows]);
    const signedCount = rows.filter((r) => r.signed).length;

    const commitRow = (row: RowDraft) => {
        setRows((current) => {
            const index = current.findIndex((r) => r.key === row.key);
            if (index >= 0) return current.map((r) => (r.key === row.key ? row : r));
            if (current.some((r) => r.numero === row.numero)) {
                toast.error(`El número ${row.numero} ya está en el intercambio.`);
                return current;
            }
            return [...current, row];
        });
        setEditingKey(null);
        setDraft(emptyDraft(row.type));
    };

    const save = async (send: boolean) => {
        if (!counterpart) {
            toast.error('Elige la administración destinataria.');
            return;
        }
        const payloadRows = rows.map(draftToRow);
        try {
            if (isEdit && id) {
                const { code, payload } = await update.mutateAsync({
                    id,
                    body: { rows: payloadRows, note: note || undefined },
                });
                toast.success(t(code));
                navigate(`/intercambios/${payload._id}`);
            } else {
                const { code, payload } = await create.mutateAsync({
                    to: counterpart._id,
                    rows: payloadRows,
                    note: note || undefined,
                    send,
                });
                toast.success(t(code));
                navigate(`/intercambios/${payload._id}`);
            }
        } catch (err) {
            if (err instanceof ApiClientError) {
                if (err.code === 'exchange.exists') {
                    const errors = err.errors as { exchangeId?: string } | undefined;
                    setExistingId(errors?.exchangeId ?? null);
                }
                toast.error(err.message);
                for (const issue of err.fieldErrors) toast.error(issue.message);
            } else {
                toast.error('No se pudo guardar el intercambio.');
            }
        }
    };

    if (isEdit && isLoading) return <Skeleton className="h-96 w-full" />;
    if (isEdit && !exchange) {
        return <EmptyState title="Intercambio no encontrado" description="Puede que se haya eliminado." />;
    }

    return (
        <>
            <PageHeader
                title={isEdit ? 'Editar intercambio' : 'Nuevo intercambio'}
                description={
                    isEdit
                        ? 'Cambia los números o la nota. Si ya estaba aceptado, la otra administración tendrá que aceptarlo de nuevo.'
                        : 'Elige la administración con la que intercambias y añade la lotería que le das.'
                }
                actions={
                    <Button asChild variant="outline">
                        <Link to={isEdit && id ? `/intercambios/${id}` : '/intercambios'}>
                            <ArrowLeft /> Volver
                        </Link>
                    </Button>
                }
            />

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Destinatario</CardTitle>
                    <CardDescription>
                        {isEdit
                            ? 'No se puede cambiar el destinatario de un intercambio.'
                            : 'Busca por nº de receptor, nombre o población.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {isEdit ? (
                        counterpart && <UserCard user={counterpart} />
                    ) : (
                        <>
                            <UserPicker
                                value={counterpart}
                                onChange={(user) => {
                                    setCounterpart(user);
                                    setExistingId(null);
                                }}
                            />
                            {counterpart && <UserCard user={counterpart} />}
                        </>
                    )}
                    {existingId && (
                        <Alert>
                            <Info />
                            <AlertTitle>Ya tienes un intercambio con esta administración</AlertTitle>
                            <AlertDescription className="flex items-center justify-between gap-2">
                                <span>Solo puede haber un sobre por administración y campaña.</span>
                                <Button asChild size="sm" variant="outline">
                                    <Link to={`/intercambios/${existingId}`}>Abrirlo</Link>
                                </Button>
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Lotería que le doy</CardTitle>
                    <CardDescription>
                        Añade una fila por número. Las series y fracciones son opcionales si aún no las conoces.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {rows.length > 0 ? (
                        <RowTable
                            rows={rows}
                            editingKey={editingKey ?? undefined}
                            onEdit={(row) => {
                                setDraft(row);
                                setEditingKey(row.key);
                            }}
                            onRemove={(row) => {
                                setRows((current) => current.filter((r) => r.key !== row.key));
                                if (editingKey === row.key) {
                                    setEditingKey(null);
                                    setDraft(emptyDraft(row.type));
                                }
                            }}
                        />
                    ) : (
                        <p className="text-sm text-muted-foreground">Todavía no has añadido ningún número.</p>
                    )}

                    <RowEditor
                        draft={draft}
                        onChange={setDraft}
                        onCommit={commitRow}
                        editing={!!editingKey}
                        onCancelEdit={() => {
                            setEditingKey(null);
                            setDraft(emptyDraft(draft.type));
                        }}
                    />

                    <div className="space-y-1.5">
                        <label htmlFor="exchange-note" className="text-sm font-medium">
                            Nota (opcional)
                        </label>
                        <Textarea
                            id="exchange-note"
                            rows={2}
                            placeholder="Cualquier aclaración para la otra administración"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
                <ExchangeTotals rowCount={rows.length} decimos={totalDecimos} signedCount={signedCount} />
                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={busy || !counterpart}
                        onClick={() => void save(false)}
                    >
                        {busy ? <Loader2 className="animate-spin" /> : <Save />}
                        {isEdit ? 'Guardar cambios' : 'Guardar borrador'}
                    </Button>
                    {!isEdit && (
                        <Button
                            type="button"
                            disabled={busy || !counterpart || rows.length === 0}
                            onClick={() => void save(true)}
                        >
                            {busy ? <Loader2 className="animate-spin" /> : <Send />} Guardar y enviar
                        </Button>
                    )}
                </div>
            </div>
        </>
    );
}
