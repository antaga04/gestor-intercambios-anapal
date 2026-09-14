import { Construction } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';

export function ComingSoonPage({ title, description }: { title: string; description?: string }) {
    return (
        <>
            <PageHeader title={title} description={description} />
            <EmptyState
                icon={Construction}
                title="En construcción"
                description="Esta sección estará disponible en una próxima fase."
            />
        </>
    );
}
