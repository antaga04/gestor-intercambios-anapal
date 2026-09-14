import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Construction } from 'lucide-react';
import type { PublicUser } from '@anapal/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { UserCard } from '@/components/common/UserCard';
import { UserPicker } from '@/features/users/components/UserPicker';

/**
 * Step 1 of the editor: choose the counterpart. The rows editor (types, scanning, totals)
 * lands in Phase 5 — see docs/08-roadmap.md.
 */
export function NewExchangePage() {
    const [counterpart, setCounterpart] = useState<PublicUser | null>(null);

    return (
        <>
            <PageHeader
                title="Nuevo intercambio"
                description="Elige la administración con la que intercambias y añade la lotería que le das."
                actions={
                    <Button asChild variant="outline">
                        <Link to="/intercambios">Cancelar</Link>
                    </Button>
                }
            />

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Destinatario</CardTitle>
                    <CardDescription>Busca por nº de receptor, nombre o población.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <UserPicker value={counterpart} onChange={setCounterpart} />
                    {counterpart && <UserCard user={counterpart} />}
                </CardContent>
            </Card>

            <EmptyState
                icon={Construction}
                title="La lotería del intercambio llega en la próxima fase"
                description="Aquí podrás añadir los números a mano, con un escáner de códigos de barras o con la cámara."
            />
        </>
    );
}
