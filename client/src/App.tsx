import { formatBilletes } from '@anapal/shared';

function App() {
    return (
        <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-6 text-foreground">
            <img src="/logotipo.png" alt="ANAPAL" className="h-16" />
            <h1 className="text-2xl font-semibold text-primary">Intercambios ANAPAL</h1>
            <p className="text-muted-foreground">Bootstrap OK · 24 décimos = {formatBilletes(24)} billetes</p>
        </main>
    );
}

export default App;
