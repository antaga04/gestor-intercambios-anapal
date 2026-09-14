import { ArrowDownLeft, ArrowUpDown, ArrowUpRight } from 'lucide-react';
import type { PairDirection } from '@anapal/shared';
import { Badge } from '@/components/ui/badge';
import { DIRECTION_LABELS } from '@/lib/labels';

const ICONS: Record<PairDirection, typeof ArrowUpRight> = {
    da: ArrowUpRight,
    recibe: ArrowDownLeft,
    ambos: ArrowUpDown,
};

export function DirectionBadge({ direction }: { direction: PairDirection }) {
    const Icon = ICONS[direction];
    return (
        <Badge variant="secondary" className="gap-1">
            <Icon className="size-3" /> {DIRECTION_LABELS[direction]}
        </Badge>
    );
}
