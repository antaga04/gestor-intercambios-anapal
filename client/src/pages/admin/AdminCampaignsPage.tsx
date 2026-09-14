import { useState } from 'react';
import { CalendarRange, Pencil, Plus } from 'lucide-react';
import type { Campaign } from '@anapal/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { CampaignFormDialog } from '@/features/admin/components/CampaignFormDialog';
import { useAdminCampaigns } from '@/features/admin/hooks';
import { formatDate } from '@/lib/format';

export function AdminCampaignsPage() {
    const { data, isLoading } = useAdminCampaigns();
    const [editing, setEditing] = useState<Campaign | null>(null);
    const [open, setOpen] = useState(false);

    const openNew = () => {
        setEditing(null);
        setOpen(true);
    };
    const openEdit = (campaign: Campaign) => {
        setEditing(campaign);
        setOpen(true);
    };

    return (
        <>
            <PageHeader
                title="Campañas"
                description="Cada sorteo es una campaña. Solo una puede estar activa."
                actions={
                    <Button onClick={openNew}>
                        <Plus /> Nueva campaña
                    </Button>
                }
            />

            {isLoading ? (
                <Skeleton className="h-40 w-full" />
            ) : !data || data.length === 0 ? (
                <EmptyState
                    icon={CalendarRange}
                    title="No hay campañas"
                    description="Crea la primera campaña para que las administraciones puedan intercambiar."
                    action={<Button onClick={openNew}>Nueva campaña</Button>}
                />
            ) : (
                <Card className="overflow-hidden p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Sorteo</TableHead>
                                <TableHead>Fecha límite</TableHead>
                                <TableHead>Código de barras</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="w-12" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((campaign) => (
                                <TableRow key={campaign._id}>
                                    <TableCell className="font-medium">{campaign.name}</TableCell>
                                    <TableCell>{formatDate(campaign.drawDate)}</TableCell>
                                    <TableCell>{formatDate(campaign.exchangeDeadline)}</TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {campaign.barcode
                                            ? `${campaign.barcode.dayDigit === '6' ? 'Jueves' : 'Sábado'} · jornada ${campaign.barcode.jornada}`
                                            : '—'}
                                    </TableCell>
                                    <TableCell>
                                        {campaign.isActive ? (
                                            <Badge>Activa</Badge>
                                        ) : (
                                            <Badge variant="outline">Inactiva</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            aria-label="Editar"
                                            onClick={() => openEdit(campaign)}
                                        >
                                            <Pencil />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}

            <CampaignFormDialog open={open} onOpenChange={setOpen} campaign={editing} />
        </>
    );
}
