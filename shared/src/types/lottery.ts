import type { LotterySource } from '../constants';
import type { SerieRange } from '../lottery/series';

export interface LotteryNumberDto {
    _id: string;
    numero: string;
    series: SerieRange[];
    source: LotterySource;
    createdAt: string;
    updatedAt: string;
}

export interface LotteryImportResult {
    inserted: number;
    updated: number;
    total: number;
}

export interface LotteryCheckResult {
    owned: boolean;
    series: SerieRange[];
}
