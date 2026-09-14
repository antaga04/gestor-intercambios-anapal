import { Loader2 } from 'lucide-react';

export function FullPageLoader({ label = 'Cargando…' }: { label?: string }) {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
            <span className="text-sm">{label}</span>
        </div>
    );
}
