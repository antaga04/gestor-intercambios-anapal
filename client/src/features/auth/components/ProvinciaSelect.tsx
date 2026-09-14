import { PROVINCIAS } from '@anapal/shared';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProvinciaSelectProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

const SORTED = [...PROVINCIAS].sort((a, b) => a.localeCompare(b, 'es'));

export function ProvinciaSelect({ value, onChange, disabled }: ProvinciaSelectProps) {
    return (
        <Select value={value} onValueChange={onChange} disabled={disabled}>
            <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona la provincia" />
            </SelectTrigger>
            <SelectContent>
                {SORTED.map((p) => (
                    <SelectItem key={p} value={p}>
                        {p}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
