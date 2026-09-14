import { ChevronDown, HelpCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const STEPS = [
    ['Crea un intercambio', 'Elige la administración con la que intercambias y añade los números que le das.'],
    [
        'Añade los números',
        'A mano, con un escáner de códigos de barras o con la cámara del móvil. Elige el tipo (billete, 1 décimo o varios décimos) antes de escanear.',
    ],
    ['Envía y espera confirmación', 'La otra administración lo verá en su bandeja y podrá aceptarlo o rechazarlo.'],
    [
        'Imprime los sobres',
        'Descarga el PDF de cada sobre o todos de golpe, y lleva el control en la lista de control.',
    ],
];

export function InstructionsCard() {
    return (
        <Collapsible>
            <Card className="py-0">
                <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-6 py-5 text-left [&[data-state=open]>svg]:rotate-180">
                    <span className="flex items-center gap-2 font-semibold">
                        <HelpCircle className="size-4 shrink-0 text-primary" /> Cómo funciona el intercambio
                    </span>
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <CardContent className="pb-6">
                        <ol className="space-y-3">
                            {STEPS.map(([title, text], i) => (
                                <li key={title} className="flex gap-3">
                                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                        {i + 1}
                                    </span>
                                    <div>
                                        <p className="text-sm font-medium">{title}</p>
                                        <p className="text-sm text-muted-foreground">{text}</p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    );
}
