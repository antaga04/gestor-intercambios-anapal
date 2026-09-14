import { ChevronDown, HelpCircle, ScanBarcode } from 'lucide-react';
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

const SCAN_TIPS = [
    'Elige primero el tipo de fila: en «Billete» el primer décimo fija la serie inicial y el segundo la final (en cualquier orden); en «Varios décimos» cada lectura añade un décimo.',
    'Con un escáner USB o Bluetooth no hace falta pulsar nada: mientras el editor está abierto verás «Escáner listo».',
    'Con la cámara del móvil, activa «Modo continuo» para leer varios décimos seguidos sin cerrar la ventana.',
    'Si escaneas un número distinto, la fila actual se guarda sola y se abre una nueva con ese número.',
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
                        <div className="mt-5 rounded-lg border bg-muted/30 p-4">
                            <p className="flex items-center gap-2 text-sm font-medium">
                                <ScanBarcode className="size-4 text-primary" /> Consejos para escanear
                            </p>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                                {SCAN_TIPS.map((tip) => (
                                    <li key={tip}>{tip}</li>
                                ))}
                            </ul>
                        </div>
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    );
}
