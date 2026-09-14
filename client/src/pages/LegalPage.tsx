import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function LegalPage() {
    useDocumentTitle('Aviso legal');
    return (
        <article className="prose prose-neutral dark:prose-invert mx-auto max-w-3xl space-y-4">
            <h1 className="text-2xl font-semibold">Aviso legal</h1>
            <p className="text-sm text-muted-foreground">
                Esta aplicación es de uso exclusivo de las administraciones de lotería asociadas a ANAPAL para la
                gestión del intercambio de lotería. Los datos de contacto de cada administración (nº de receptor,
                nombre, población, provincia, teléfono y persona de contacto) son visibles para el resto de
                administraciones registradas con el único fin de organizar los intercambios.
            </p>
            <p className="text-sm text-muted-foreground">Texto pendiente de revisión por ANAPAL.</p>
        </article>
    );
}
