import type { Paginated } from '@anapal/shared';
import { Button } from '@/components/ui/button';
import { formatInt } from '@/lib/format';

interface PaginationProps {
    pagination: Paginated<unknown>['pagination'];
    noun: string;
    onPage: (page: number) => void;
}

export function Pagination({ pagination, noun, onPage }: PaginationProps) {
    if (pagination.totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
                {formatInt(pagination.totalItems)} {noun} · página {pagination.currentPage} de {pagination.totalPages}
            </p>
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasPreviousPage}
                    onClick={() => onPage(pagination.currentPage - 1)}
                >
                    Anterior
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasNextPage}
                    onClick={() => onPage(pagination.currentPage + 1)}
                >
                    Siguiente
                </Button>
            </div>
        </div>
    );
}
