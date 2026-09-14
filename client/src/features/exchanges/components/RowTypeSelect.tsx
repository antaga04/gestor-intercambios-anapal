import type { RowType } from '@anapal/shared';
import { ROW_TYPE_LABELS, ROW_TYPES } from '@anapal/shared';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const HINTS: Record<RowType, string> = {
    billete: '10 décimos por serie',
    decimo: 'un único décimo',
    decimos: 'varios décimos del mismo número',
};

interface RowTypeSelectProps {
    value: RowType;
    onChange: (type: RowType) => void;
    disabled?: boolean;
}

export function RowTypeSelect({ value, onChange, disabled }: RowTypeSelectProps) {
    return (
        <div className="space-y-1.5">
            <p className="text-sm font-medium">Tipo de fila</p>
            <div className="inline-flex flex-wrap gap-1 rounded-md border p-1" role="group" aria-label="Tipo de fila">
                {ROW_TYPES.map((type) => (
                    <Button
                        key={type}
                        type="button"
                        size="sm"
                        variant={value === type ? 'default' : 'ghost'}
                        aria-pressed={value === type}
                        disabled={disabled}
                        onClick={() => onChange(type)}
                        className={cn('h-8', value !== type && 'text-muted-foreground')}
                    >
                        {ROW_TYPE_LABELS[type]}
                    </Button>
                ))}
            </div>
            <p className="text-xs text-muted-foreground">{HINTS[value]}</p>
        </div>
    );
}
