import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeftRight, Inbox, Search } from 'lucide-react';
import { EXCHANGE_STATUS, type ExchangeStatus } from '@anapal/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { ExchangeTable } from '@/features/exchanges/components/ExchangeTable';
import { useExchanges, useInbox } from '@/features/exchanges/hooks';
import { useDashboard } from '@/features/dashboard/hooks';
import { STATUS_LABELS } from '@/lib/labels';
import { formatInt } from '@/lib/format';
import { useDebounce } from '@/hooks/useDebounce';

type Tab = 'enviados' | 'recibidos' | 'bandeja';

const ALL = 'todos';

export function ExchangesListPage() {
    const [params, setParams] = useSearchParams();
    const tab = (params.get('tab') as Tab | null) ?? 'enviados';
    const status = params.get('estado') ?? ALL;
    const q = params.get('q') ?? '';
    const page = Number(params.get('page') ?? 1);

    const [searchInput, setSearchInput] = useState(q);
    const debouncedSearch = useDebounce(searchInput.trim(), 350);

    const { data: dashboard } = useDashboard();
    const inboxCount = dashboard?.inboxPending ?? 0;

    const query = useMemo(
        () => ({
            direction: (tab === 'recibidos' ? 'in' : 'out') as 'in' | 'out',
            status: status === ALL ? undefined : (status as ExchangeStatus),
            q: q || undefined,
            page,
        }),
        [tab, status, q, page],
    );

    useEffect(() => {
        if (debouncedSearch !== q) setParam('q', debouncedSearch);
        // setParam is stable enough for this effect: it only reads the current search params.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    const listQuery = useExchanges(query, tab !== 'bandeja');
    const inboxQuery = useInbox(tab === 'bandeja');
    const isLoading = tab === 'bandeja' ? inboxQuery.isLoading : listQuery.isLoading;
    const items = tab === 'bandeja' ? (inboxQuery.data ?? []) : (listQuery.data?.items ?? []);
    const pagination = tab === 'bandeja' ? null : listQuery.data?.pagination;

    const setParam = (key: string, value: string | null) => {
        const next = new URLSearchParams(params);
        if (value === null || value === '' || value === ALL) next.delete(key);
        else next.set(key, value);
        if (key !== 'page') next.delete('page');
        setParams(next, { replace: true });
    };

    return (
        <>
            <PageHeader
                title="Intercambios"
                description="Los sobres que envías y los que recibes en esta campaña."
                actions={
                    <Button asChild>
                        <Link to="/intercambios/nuevo">
                            <ArrowLeftRight /> Nuevo intercambio
                        </Link>
                    </Button>
                }
            />

            <Tabs value={tab} onValueChange={(value) => setParam('tab', value)}>
                <TabsList>
                    <TabsTrigger value="enviados">Enviados</TabsTrigger>
                    <TabsTrigger value="recibidos">Recibidos</TabsTrigger>
                    <TabsTrigger value="bandeja" className="gap-2">
                        Bandeja
                        {inboxCount > 0 && (
                            <Badge className="h-5 min-w-5 px-1 tabular-nums" variant="default">
                                {inboxCount}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            {tab !== 'bandeja' && (
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative min-w-56 flex-1">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            className="pl-9"
                            placeholder="Nº de receptor, nombre o población…"
                            value={searchInput}
                            aria-label="Buscar administración"
                            onChange={(e) => setSearchInput(e.target.value)}
                        />
                    </div>
                    <Select value={status} onValueChange={(value) => setParam('estado', value)}>
                        <SelectTrigger className="w-48">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>Todos los estados</SelectItem>
                            {EXCHANGE_STATUS.filter((s) => !(tab === 'recibidos' && s === 'draft')).map((s) => (
                                <SelectItem key={s} value={s}>
                                    {STATUS_LABELS[s]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {isLoading ? (
                <Skeleton className="h-64 w-full" />
            ) : items.length === 0 ? (
                <EmptyState
                    icon={tab === 'bandeja' ? Inbox : ArrowLeftRight}
                    title={
                        tab === 'bandeja'
                            ? 'No tienes intercambios pendientes de aceptar'
                            : tab === 'recibidos'
                              ? 'Todavía no has recibido intercambios'
                              : 'Todavía no has creado ningún intercambio'
                    }
                    description={
                        tab === 'enviados'
                            ? 'Crea el primero eligiendo la administración con la que intercambias.'
                            : undefined
                    }
                    action={
                        tab === 'enviados' ? (
                            <Button asChild>
                                <Link to="/intercambios/nuevo">Nuevo intercambio</Link>
                            </Button>
                        ) : undefined
                    }
                />
            ) : (
                <div className="space-y-3">
                    <ExchangeTable items={items} direction={tab === 'recibidos' || tab === 'bandeja' ? 'in' : 'out'} />
                    {pagination && pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                                {formatInt(pagination.totalItems)} intercambios · página {pagination.currentPage} de{' '}
                                {pagination.totalPages}
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!pagination.hasPreviousPage}
                                    onClick={() => setParam('page', String(pagination.currentPage - 1))}
                                >
                                    Anterior
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!pagination.hasNextPage}
                                    onClick={() => setParam('page', String(pagination.currentPage + 1))}
                                >
                                    Siguiente
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
