import { useMemo, useState } from 'react';
import { History, Info, Search } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { LegacyTable } from '@/features/legacy/components/LegacyTable';
import { useLegacyExchanges } from '@/features/legacy/hooks';
import { formatBilletes, formatInt } from '@/lib/format';

/** Read-only view of what the user had in the previous app. Nothing here can be edited. */
export function HistoricoPage() {
    const { data, isLoading } = useLegacyExchanges();
    const [search, setSearch] = useState('');

    const items = useMemo(() => data ?? [], [data]);
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return items;
        return items.filter(
            (item) =>
                item.counterpart.name.toLowerCase().includes(q) ||
                item.counterpart.receptorNumber.includes(q) ||
                (item.counterpart.poblacion ?? '').toLowerCase().includes(q) ||
                item.lines.some((line) => line.numero?.includes(q)),
        );
    }, [items, search]);

    const totals = useMemo(
        () => ({
            out: items.reduce((acc, item) => acc + item.decimosOut, 0),
            in: items.reduce((acc, item) => acc + item.decimosIn, 0),
            converted: items.filter((item) => item.migrated.out || item.migrated.in).length,
        }),
        [items],
    );

    return (
        <>
            <PageHeader
                title="Histórico"
                description="Tus intercambios de la versión anterior de la aplicación, tal y como los registraste."
            />

            <Alert className="border-primary/50 bg-primary/5">
                <Info />
                <AlertTitle>Datos de la versión anterior</AlertTitle>
                <AlertDescription>
                    <p>
                        Esta lista es de solo lectura. Cuando la otra administración también está registrada, el
                        intercambio se ha convertido a la nueva versión y puedes abrirlo desde la columna «Nueva
                        versión»; las líneas marcadas con ✓ ya forman parte de él. Las líneas sin número (por ejemplo «5
                        billetes») no se pudieron convertir: si las necesitas, añádelas a mano en el intercambio.
                    </p>
                </AlertDescription>
            </Alert>

            {!isLoading && items.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-3">
                    {[
                        ['Registros', formatInt(items.length)],
                        ['Convertidos', formatInt(totals.converted)],
                        ['Daba / recibía', `${formatBilletes(totals.out)} / ${formatBilletes(totals.in)} billetes`],
                    ].map(([label, value]) => (
                        <div key={label} className="rounded-lg border bg-card px-4 py-3 shadow-soft">
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <p className="text-lg font-semibold tabular-nums">{value}</p>
                        </div>
                    ))}
                </div>
            )}

            {isLoading ? (
                <Skeleton className="h-64 w-full" />
            ) : items.length === 0 ? (
                <EmptyState
                    icon={History}
                    title="No hay datos de la versión anterior"
                    description="Aquí aparecerían los intercambios que registraste en la aplicación antigua."
                />
            ) : (
                <>
                    <div className="relative max-w-sm">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar administración, nº receptor o número"
                            className="pl-8"
                            aria-label="Buscar en el histórico"
                        />
                    </div>
                    {filtered.length === 0 ? (
                        <EmptyState title="Sin resultados" description="Prueba con otro nombre o número." />
                    ) : (
                        <LegacyTable items={filtered} />
                    )}
                </>
            )}
        </>
    );
}
