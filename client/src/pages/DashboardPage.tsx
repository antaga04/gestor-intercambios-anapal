import { Link } from 'react-router-dom';
import { ArrowLeftRight, ClipboardList, Inbox, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/PageHeader';
import { MustChangePasswordAlert } from '@/components/common/MustChangePasswordAlert';
import { useAuth } from '@/features/auth/hooks';
import { CampaignBanner } from '@/features/campaigns/components/CampaignBanner';

const QUICK_ACTIONS = [
    { to: '/intercambios/nuevo', label: 'Nuevo intercambio', icon: ArrowLeftRight },
    { to: '/intercambios?tab=bandeja', label: 'Ver bandeja', icon: Inbox },
    { to: '/mi-loteria', label: 'Importar lotería', icon: Ticket },
    { to: '/lista-control', label: 'Lista de control', icon: ClipboardList },
];

const PLACEHOLDER_STATS = [
    'Sobres a enviar',
    'Sobres a recibir',
    'Billetes que doy',
    'Billetes que recibo',
    'Pendientes en bandeja',
    'Intercambios aceptados',
    'Borradores',
    'Números en mi lotería',
];

export function DashboardPage() {
    const { user } = useAuth();
    return (
        <>
            <PageHeader
                title={`Hola, ${user?.name ?? ''}`}
                description={`Nº de receptor ${user?.receptorNumber ?? ''}`}
            />
            <MustChangePasswordAlert />
            <CampaignBanner />

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {PLACEHOLDER_STATS.map((label) => (
                    <Card key={label}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-semibold">—</p>
                        </CardContent>
                    </Card>
                ))}
            </section>

            <section className="space-y-3">
                <h2 className="text-base font-semibold">Acciones rápidas</h2>
                <div className="flex flex-wrap gap-2">
                    {QUICK_ACTIONS.map((a) => (
                        <Button key={a.to} asChild variant="outline">
                            <Link to={a.to}>
                                <a.icon /> {a.label}
                            </Link>
                        </Button>
                    ))}
                </div>
            </section>
        </>
    );
}
