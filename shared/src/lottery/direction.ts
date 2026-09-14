import { LIVE_EXCHANGE_STATUS, type ExchangeStatus, type PairDirection } from '../constants';

export const isLiveStatus = (status: ExchangeStatus): boolean => LIVE_EXCHANGE_STATUS.includes(status);

/**
 * Direction of a pair from the viewer's point of view.
 * `gives` is the viewer's outgoing exchange, `receives` the counterpart's outgoing one.
 */
export function pairDirection(
    gives: { status: ExchangeStatus } | null | undefined,
    receives: { status: ExchangeStatus } | null | undefined,
): PairDirection {
    const out = !!gives && isLiveStatus(gives.status);
    const inc = !!receives && isLiveStatus(receives.status);
    if (out && inc) return 'ambos';
    if (inc) return 'recibe';
    return 'da';
}
