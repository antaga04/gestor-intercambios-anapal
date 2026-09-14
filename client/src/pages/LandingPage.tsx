import { Link } from 'react-router-dom';
import { ArrowLeftRight, CalendarDays, Clock, Printer, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Logo } from '@/components/common/Logo';
import { useAuth } from '@/features/auth/hooks';
import { isCampaignClosed, useActiveCampaign } from '@/features/campaigns/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { daysUntil, formatLongDate } from '@/lib/format';

const STEPS = [
    {
        icon: UserPlus,
        title: 'Registra tu administración',
        text: 'Crea tu cuenta con tu nº de receptor, población y provincia. Verifica el email y listo.',
    },
    {
        icon: ArrowLeftRight,
        title: 'Crea tus intercambios',
        text: 'Elige la administración, añade los números (a mano, con escáner o con la cámara) y envía.',
    },
    {
        icon: Printer,
        title: 'Imprime sobres y lista de control',
        text: 'Genera los sobres en PDF y lleva el control de lo que das y lo que recibes.',
    },
];

export function LandingPage() {
    useDocumentTitle();
    const { status } = useAuth();
    const { data: campaign, isLoading } = useActiveCampaign();
    const closed = campaign ? isCampaignClosed(campaign) : false;
    const days = campaign ? daysUntil(campaign.exchangeDeadline) : 0;

    return (
        <div className="space-y-12">
            <section className="flex flex-col items-center gap-6 text-center">
                <Logo className="h-20" />
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">Intercambios ANAPAL</h1>
                    <p className="mx-auto max-w-2xl text-muted-foreground">
                        La herramienta de las administraciones de lotería para organizar el intercambio anual: quién
                        intercambia con quién, qué números van en cada sobre y el control de todo lo enviado y recibido.
                    </p>
                </div>
                {isLoading ? (
                    <Skeleton className="h-24 w-full max-w-lg" />
                ) : campaign ? (
                    <Card className="w-full max-w-lg text-left">
                        <CardHeader>
                            <CardTitle className="text-lg">{campaign.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                            <div className="flex items-start gap-2">
                                <CalendarDays className="mt-0.5 size-4 text-primary" />
                                <div>
                                    <p className="text-muted-foreground">Sorteo</p>
                                    <p className="font-medium">{formatLongDate(campaign.drawDate)}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <Clock className="mt-0.5 size-4 text-primary" />
                                <div>
                                    <p className="text-muted-foreground">Plazo de intercambio</p>
                                    <p className="font-medium">
                                        {formatLongDate(campaign.exchangeDeadline)}
                                        {closed ? (
                                            <span className="ml-2 text-destructive">(cerrado)</span>
                                        ) : (
                                            <span className="ml-2 text-muted-foreground">
                                                (
                                                {days === 0
                                                    ? 'hoy'
                                                    : days === 1
                                                      ? 'queda 1 día'
                                                      : `quedan ${days} días`}
                                                )
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            {campaign.landingText && (
                                <p className="whitespace-pre-line text-muted-foreground sm:col-span-2">
                                    {campaign.landingText}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <p className="text-sm text-muted-foreground">Próximamente: aún no hay una campaña activa.</p>
                )}
                <div className="flex flex-wrap justify-center gap-2">
                    {status === 'authenticated' ? (
                        <Button asChild size="lg">
                            <Link to="/dashboard">Ir al panel</Link>
                        </Button>
                    ) : (
                        <>
                            <Button asChild size="lg">
                                <Link to="/registro">Registrar mi administración</Link>
                            </Button>
                            <Button asChild size="lg" variant="outline">
                                <Link to="/login">Entrar</Link>
                            </Button>
                        </>
                    )}
                </div>
            </section>

            <section className="space-y-6">
                <h2 className="text-center text-xl font-semibold">Cómo funciona</h2>
                <div className="grid gap-4 md:grid-cols-3">
                    {STEPS.map((s, i) => (
                        <Card key={s.title}>
                            <CardHeader className="flex-row items-center gap-3 space-y-0">
                                <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                                    <s.icon className="size-5" />
                                </span>
                                <CardTitle className="text-base">
                                    {i + 1}. {s.title}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground">{s.text}</CardContent>
                        </Card>
                    ))}
                </div>
            </section>
        </div>
    );
}
