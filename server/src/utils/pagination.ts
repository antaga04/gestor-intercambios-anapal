import type { Query } from 'mongoose';
import type { Paginated, PaginationQuery } from '@anapal/shared';

/**
 * Runs a paginated find + count. `query` must be a fresh mongoose Query (it is cloned for the count).
 */
export async function paginate<T>(query: Query<T[], unknown>, { page, limit }: PaginationQuery): Promise<Paginated<T>> {
    const countQuery = query.clone();
    const [items, totalItems] = await Promise.all([
        query
            .skip((page - 1) * limit)
            .limit(limit)
            .exec(),
        countQuery.countDocuments().exec(),
    ]);
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    return {
        items,
        pagination: {
            totalItems,
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
        },
    };
}

export function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
