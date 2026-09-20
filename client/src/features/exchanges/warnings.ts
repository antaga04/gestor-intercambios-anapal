import { rowSeries } from '@anapal/shared';
import { useExchangeOverlap } from '@/features/exchanges/hooks';
import { draftToRow, type RowDraft } from '@/features/exchanges/rowDraft';
import { useLottery, useLotteryCheck } from '@/features/lottery/hooks';

/**
 * Non-blocking hints on a row (docs/03 §2). An exchange exists to gain numbers you lack, so giving a
 * number the other side already has, or receiving one you already have, is almost always a mistake —
 * but it is never forbidden.
 */
export type RowWarning =
    // what I give, checked against my own "Mi lotería"
    | 'numero_not_owned'
    | 'serie_not_owned'
    // what I give, checked against the other side
    | 'receiver_owns'
    | 'receiver_gives'
    // what I receive
    | 'already_owned'
    | 'i_also_give';

export const ROW_WARNING_TEXT: Record<RowWarning, string> = {
    numero_not_owned: 'No tienes este número en tu lotería',
    serie_not_owned: 'No tienes esas series de este número',
    receiver_owns: 'La otra administración ya tiene este número',
    receiver_gives: 'La otra administración también te da este número',
    already_owned: 'Ya tienes este número en tu lotería',
    i_also_give: 'Tú también le das este número',
};

export type RowWarningsFn = (row: RowDraft) => RowWarning[];

/** Warnings for the numbers I give to `counterpartId`: my list plus what they own / give back. */
export function useOutgoingWarnings(counterpartId: string | undefined, numeros: string[]): RowWarningsFn {
    const checkLottery = useLotteryCheck();
    const { data: overlap } = useExchangeOverlap(counterpartId, numeros);
    const theyOwn = new Set(overlap?.inTheirLottery ?? []);
    const theyGive = new Set(overlap?.inTheirEnvelope ?? []);

    return (row) => {
        if (row.numero.length !== 5) return [];
        const warnings: RowWarning[] = [];
        const mine = checkLottery(row.numero, rowSeries(draftToRow(row)));
        if (mine) warnings.push(mine);
        if (theyOwn.has(row.numero)) warnings.push('receiver_owns');
        if (theyGive.has(row.numero)) warnings.push('receiver_gives');
        return warnings;
    };
}

/** Warnings for the numbers I receive: already in my list, or also in the envelope I send back. */
export function useIncomingWarnings(outgoingNumeros: string[]): RowWarningsFn {
    const { data: list } = useLottery();
    const owned = new Set((list ?? []).map((item) => item.numero));
    const iGive = new Set(outgoingNumeros);

    return (row) => {
        const warnings: RowWarning[] = [];
        if (owned.has(row.numero)) warnings.push('already_owned');
        if (iGive.has(row.numero)) warnings.push('i_also_give');
        return warnings;
    };
}

/** Distinct numbers flagged by `warningsFor`, for the summary line above a table. */
export function countWarnedRows(rows: RowDraft[], warningsFor: RowWarningsFn): number {
    return rows.filter((row) => warningsFor(row).length > 0).length;
}
