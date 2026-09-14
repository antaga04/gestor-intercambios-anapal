import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdminCampaigns } from '@/features/admin/hooks';

interface CampaignSelectProps {
    /** `undefined` = the active campaign. */
    value: string | undefined;
    onChange: (id: string | undefined) => void;
}

const ACTIVE = '__active__';

/** Lets admins look at past campaigns; defaults to the active one. */
export function CampaignSelect({ value, onChange }: CampaignSelectProps) {
    const { data } = useAdminCampaigns();
    if (!data || data.length <= 1) return null;
    return (
        <Select value={value ?? ACTIVE} onValueChange={(v) => onChange(v === ACTIVE ? undefined : v)}>
            <SelectTrigger className="w-56" aria-label="Campaña">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value={ACTIVE}>Campaña activa</SelectItem>
                {data.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                        {c.name}
                        {c.isActive ? ' (activa)' : ''}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
