import { ArrowDownToLine, ArrowUpFromLine, FileEdit, Mail, MailOpen } from 'lucide-react';
import type { ControlListTotals as Totals } from '@anapal/shared';
import { StatCard } from '@/features/dashboard/components/StatCard';
import { formatBilletes, formatInt } from '@/lib/format';

export function ControlListTotals({ totals, loading }: { totals?: Totals; loading?: boolean }) {
    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
                label="Sobres a enviar"
                value={formatInt(totals?.envelopesToSend ?? 0)}
                icon={Mail}
                loading={loading}
            />
            <StatCard
                label="Sobres a recibir"
                value={formatInt(totals?.envelopesToReceive ?? 0)}
                icon={MailOpen}
                loading={loading}
            />
            <StatCard
                label="Billetes que doy"
                value={formatBilletes(totals?.decimosOut ?? 0)}
                hint={`${formatInt(totals?.decimosOut ?? 0)} décimos`}
                icon={ArrowUpFromLine}
                loading={loading}
            />
            <StatCard
                label="Billetes que recibo"
                value={formatBilletes(totals?.decimosIn ?? 0)}
                hint={`${formatInt(totals?.decimosIn ?? 0)} décimos`}
                icon={ArrowDownToLine}
                loading={loading}
            />
            <StatCard
                label="Borradores sin enviar"
                value={formatInt(totals?.drafts ?? 0)}
                hint={totals?.drafts ? 'No cuentan hasta que los envíes' : undefined}
                icon={FileEdit}
                loading={loading}
                highlight={!!totals?.drafts}
                to={totals?.drafts ? '/intercambios?estado=draft' : undefined}
            />
        </div>
    );
}
