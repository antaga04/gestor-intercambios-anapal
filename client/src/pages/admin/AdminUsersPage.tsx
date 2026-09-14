import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Users } from 'lucide-react';
import { ROLES, USER_STATUS, type Role, type UserStatus } from '@anapal/shared';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Pagination } from '@/components/common/Pagination';
import { AdminUsersTable } from '@/features/admin/components/AdminUsersTable';
import { ROLE_LABELS, USER_STATUS_LABELS } from '@/lib/labels';
import { useAdminUsers } from '@/features/admin/hooks';
import { useDebounce } from '@/hooks/useDebounce';

const ALL = 'todos';
type Sort = 'lastSeenAt' | 'createdAt' | 'receptorNumber';
const SORT_LABELS: Record<Sort, string> = {
    createdAt: 'Alta más reciente',
    lastSeenAt: 'Última conexión',
    receptorNumber: 'Nº de receptor',
};

export function AdminUsersPage() {
    const [params, setParams] = useSearchParams();
    const q = params.get('q') ?? '';
    const status = params.get('estado') ?? ALL;
    const role = params.get('rol') ?? ALL;
    const sort = (params.get('orden') as Sort | null) ?? 'createdAt';
    const page = Number(params.get('page') ?? 1);

    const [searchInput, setSearchInput] = useState(q);
    const debouncedSearch = useDebounce(searchInput.trim(), 350);

    const setParam = (key: string, value: string | null) => {
        const next = new URLSearchParams(params);
        if (value === null || value === '' || value === ALL) next.delete(key);
        else next.set(key, value);
        if (key !== 'page') next.delete('page');
        setParams(next, { replace: true });
    };

    useEffect(() => {
        if (debouncedSearch !== q) setParam('q', debouncedSearch);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    const query = useMemo(
        () => ({
            q: q || undefined,
            status: status === ALL ? undefined : (status as UserStatus),
            role: role === ALL ? undefined : (role as Role),
            sort,
            page,
        }),
        [q, status, role, sort, page],
    );
    const { data, isLoading } = useAdminUsers(query);

    return (
        <>
            <PageHeader title="Usuarios" description="Todas las administraciones registradas y su actividad." />

            <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-56 flex-1">
                    <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        className="pl-9"
                        placeholder="Nº de receptor, nombre, población o email…"
                        value={searchInput}
                        aria-label="Buscar usuario"
                        onChange={(e) => setSearchInput(e.target.value)}
                    />
                </div>
                <Select value={status} onValueChange={(v) => setParam('estado', v)}>
                    <SelectTrigger className="w-48" aria-label="Estado">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ALL}>Todos los estados</SelectItem>
                        {USER_STATUS.map((s) => (
                            <SelectItem key={s} value={s}>
                                {USER_STATUS_LABELS[s]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={role} onValueChange={(v) => setParam('rol', v)}>
                    <SelectTrigger className="w-44" aria-label="Rol">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ALL}>Todos los roles</SelectItem>
                        {ROLES.map((r) => (
                            <SelectItem key={r} value={r}>
                                {ROLE_LABELS[r]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={sort} onValueChange={(v) => setParam('orden', v)}>
                    <SelectTrigger className="w-48" aria-label="Orden">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {(Object.keys(SORT_LABELS) as Sort[]).map((s) => (
                            <SelectItem key={s} value={s}>
                                {SORT_LABELS[s]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {isLoading ? (
                <Skeleton className="h-64 w-full" />
            ) : !data || data.items.length === 0 ? (
                <EmptyState
                    icon={Users}
                    title="Ningún usuario coincide"
                    description="Prueba con otra búsqueda o filtro."
                />
            ) : (
                <div className="space-y-3">
                    <AdminUsersTable items={data.items} />
                    <Pagination
                        pagination={data.pagination}
                        noun="usuarios"
                        onPage={(p) => setParam('page', String(p))}
                    />
                </div>
            )}
        </>
    );
}
