import { useMemo, useState } from 'react';
import { Search, Ticket, Trash, Upload } from 'lucide-react';
import { toast } from 'sonner';
import type { LotteryNumberDto } from '@anapal/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/PageHeader';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { AddNumberForm } from '@/features/lottery/components/AddNumberForm';
import { LotteryImportDialog } from '@/features/lottery/components/LotteryImportDialog';
import { LotteryTable } from '@/features/lottery/components/LotteryTable';
import { useClearLottery, useLottery, useRemoveLotteryNumber } from '@/features/lottery/hooks';
import { ApiClientError } from '@/lib/api';
import { formatInt } from '@/lib/format';
import { t } from '@/lib/messages';

export function MyLotteryPage() {
    const { data, isLoading } = useLottery();
    const remove = useRemoveLotteryNumber();
    const clear = useClearLottery();
    const [importOpen, setImportOpen] = useState(false);
    const [clearOpen, setClearOpen] = useState(false);
    const [search, setSearch] = useState('');

    const items = useMemo(() => data ?? [], [data]);
    const filtered = useMemo(
        () => (search.trim() ? items.filter((i) => i.numero.includes(search.trim())) : items),
        [items, search],
    );

    const onRemove = async (item: LotteryNumberDto) => {
        try {
            const { code } = await remove.mutateAsync(item._id);
            toast.success(t(code));
        } catch (err) {
            toast.error(err instanceof ApiClientError ? err.message : 'No se pudo eliminar el número.');
        }
    };

    const onClear = async () => {
        try {
            const { payload, code } = await clear.mutateAsync();
            toast.success(`${t(code)} (${formatInt(payload.deleted)} números)`);
            setClearOpen(false);
        } catch (err) {
            toast.error(err instanceof ApiClientError ? err.message : 'No se pudo vaciar la lista.');
        }
    };

    return (
        <>
            <PageHeader
                title="Mi lotería"
                description="Los números que tienes para esta campaña. Se usan para avisarte si añades a un intercambio un número que no tienes."
                actions={
                    <>
                        <Button onClick={() => setImportOpen(true)}>
                            <Upload /> Importar
                        </Button>
                        {items.length > 0 && (
                            <Button variant="outline" onClick={() => setClearOpen(true)}>
                                <Trash /> Vaciar lista
                            </Button>
                        )}
                    </>
                }
            />

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Añadir un número</CardTitle>
                    <CardDescription>Las series son opcionales: sin ellas solo se comprueba el número.</CardDescription>
                </CardHeader>
                <CardContent>
                    <AddNumberForm />
                </CardContent>
            </Card>

            {isLoading ? (
                <Skeleton className="h-64 w-full" />
            ) : items.length === 0 ? (
                <EmptyState
                    icon={Ticket}
                    title="Tu lista está vacía"
                    description="Importa tu lotería o añade números a mano. Si no guardas ninguno, no se hará ninguna comprobación al crear intercambios."
                    action={<Button onClick={() => setImportOpen(true)}>Importar lista</Button>}
                />
            ) : (
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-muted-foreground">
                            <strong className="text-foreground">{formatInt(items.length)}</strong>{' '}
                            {items.length === 1 ? 'número guardado' : 'números guardados'}
                            {search && ` · ${formatInt(filtered.length)} coinciden`}
                        </p>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                className="pl-9"
                                inputMode="numeric"
                                placeholder="Buscar número…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                aria-label="Buscar número"
                            />
                        </div>
                    </div>
                    {filtered.length === 0 ? (
                        <EmptyState
                            icon={Search}
                            title="Ningún número coincide"
                            description={`No se ha encontrado «${search}».`}
                        />
                    ) : (
                        <LotteryTable
                            items={filtered}
                            onRemove={(item) => void onRemove(item)}
                            removingId={remove.variables}
                        />
                    )}
                </div>
            )}

            <LotteryImportDialog open={importOpen} onOpenChange={setImportOpen} currentCount={items.length} />
            <ConfirmDialog
                open={clearOpen}
                onOpenChange={setClearOpen}
                title="¿Vaciar tu lista de lotería?"
                description={`Se eliminarán los ${formatInt(items.length)} números guardados de esta campaña. Los intercambios no se modifican.`}
                confirmLabel="Vaciar lista"
                destructive
                loading={clear.isPending}
                onConfirm={() => void onClear()}
            />
        </>
    );
}
