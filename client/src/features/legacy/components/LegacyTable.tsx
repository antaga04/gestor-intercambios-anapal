import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, Check, ChevronDown, ExternalLink } from 'lucide-react';
import type { LegacyEstado, LegacyExchange, LegacyLine } from '@anapal/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatBilletes, formatDate, formatInt } from '@/lib/format';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const ESTADO_STYLES: Record<LegacyEstado, string> = {
    'En edición': 'bg-muted text-muted-foreground',
    'Pendiente de ensobrado': 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    Ensobrado: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
};

function EstadoBadge({ estado }: { estado: LegacyEstado }) {
    return (
        <Badge variant="outline" className={cn('border-transparent', ESTADO_STYLES[estado])}>
            {estado}
        </Badge>
    );
}

/** The physical envelope checks of the previous app, as three ticks. */
function EnvelopeChecks({ envelope }: { envelope: LegacyExchange['envelope'] }) {
    const items: [string, boolean][] = [
        ['Sobre entregado', envelope.delivered],
        ['Sobre recibido', envelope.received],
        ['Recepcionado', envelope.checked],
    ];
    return (
        <div className="flex items-center gap-1.5">
            {items.map(([label, done]) => (
                <Tooltip key={label}>
                    <TooltipTrigger asChild>
                        <span
                            aria-label={`${label}: ${done ? 'sí' : 'no'}`}
                            className={cn(
                                'inline-flex size-5 items-center justify-center rounded-full border text-[10px]',
                                done
                                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                    : 'text-muted-foreground/50',
                            )}
                        >
                            {done ? <Check className="size-3" /> : '·'}
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>{label}</TooltipContent>
                </Tooltip>
            ))}
        </div>
    );
}

/** "3 billetes", "1 décimo (serie 12, fracción 4)", "25 décimos" — as the old app counted it. */
function describeLine(line: LegacyLine): string {
    if (line.modo === 'billete') {
        const amount = Number.isInteger(line.billetes)
            ? formatInt(line.billetes)
            : formatBilletes(Math.round(line.billetes * 10));
        return `${amount} ${line.billetes === 1 ? 'billete' : 'billetes'}`;
    }
    const decimos = Math.round(line.billetes * 10);
    const serie = [line.serie != null && `serie ${line.serie}`, line.fraccion != null && `fracción ${line.fraccion}`]
        .filter(Boolean)
        .join(', ');
    return `${decimos} ${decimos === 1 ? 'décimo' : 'décimos'}${serie ? ` (${serie})` : ''}`;
}

function Lines({ item }: { item: LegacyExchange }) {
    if (item.lines.length === 0) return <p className="text-sm text-muted-foreground">Sin líneas.</p>;
    return (
        <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {item.lines.map((line, index) => {
                const Icon = line.tipo === 'Entrego' ? ArrowUpRight : ArrowDownLeft;
                return (
                    <li key={index} className="flex items-center gap-2">
                        <Icon
                            className={cn(
                                'size-3.5 shrink-0',
                                line.tipo === 'Entrego' ? 'text-primary' : 'text-sky-600',
                            )}
                            aria-label={line.tipo}
                        />
                        <span className="font-mono">{line.numero ?? '—'}</span>
                        <span className="text-muted-foreground">{describeLine(line)}</span>
                        {line.sellado && (
                            <Badge variant="outline" className="h-4 px-1 text-[10px]">
                                sellado
                            </Badge>
                        )}
                        {line.migrated && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Check
                                        className="size-3.5 text-emerald-600"
                                        aria-label="Convertida a la nueva versión"
                                    />
                                </TooltipTrigger>
                                <TooltipContent>Convertida a un intercambio de la nueva versión</TooltipContent>
                            </Tooltip>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}

function MigratedLinks({ item }: { item: LegacyExchange }) {
    const links = [
        item.migrated.out && { id: item.migrated.out, label: 'Lo que doy' },
        item.migrated.in && { id: item.migrated.in, label: 'Lo que recibo' },
    ].filter((l): l is { id: string; label: string } => !!l);
    if (links.length === 0) return <span className="text-xs text-muted-foreground">Solo en el histórico</span>;
    return (
        <div className="flex flex-wrap gap-1">
            {links.map((link) => (
                <Button key={link.id} asChild variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs">
                    <Link to={`/intercambios/${link.id}`}>
                        {link.label} <ExternalLink className="size-3" />
                    </Link>
                </Button>
            ))}
        </div>
    );
}

function Counterpart({ item }: { item: LegacyExchange }) {
    const { counterpart } = item;
    return (
        <div className="min-w-0">
            <p className="truncate font-medium">{counterpart.name}</p>
            <p className="truncate text-xs text-muted-foreground">
                <span className="font-mono">Nº {counterpart.receptorNumber}</span>
                {counterpart.poblacion && ` · ${counterpart.poblacion}`}
                {counterpart.provincia && ` (${counterpart.provincia})`}
            </p>
        </div>
    );
}

export function LegacyTable({ items }: { items: LegacyExchange[] }) {
    const isMobile = useIsMobile();
    const [open, setOpen] = useState<string | null>(null);
    const toggle = (id: string) => setOpen((current) => (current === id ? null : id));

    if (isMobile) {
        return (
            <div className="space-y-3">
                {items.map((item) => (
                    <Card key={item._id} className="gap-3 p-4">
                        <div className="flex items-start justify-between gap-2">
                            <Counterpart item={item} />
                            <EstadoBadge estado={item.estado} />
                        </div>
                        <dl className="grid grid-cols-3 gap-2 text-sm">
                            <div>
                                <dt className="text-xs text-muted-foreground">Fecha</dt>
                                <dd>{formatDate(item.fecha)}</dd>
                            </div>
                            <div>
                                <dt className="text-xs text-muted-foreground">Doy</dt>
                                <dd className="tabular-nums">{formatBilletes(item.decimosOut)}</dd>
                            </div>
                            <div>
                                <dt className="text-xs text-muted-foreground">Recibo</dt>
                                <dd className="tabular-nums">{formatBilletes(item.decimosIn)}</dd>
                            </div>
                        </dl>
                        <div className="flex items-center justify-between gap-2">
                            <EnvelopeChecks envelope={item.envelope} />
                            <MigratedLinks item={item} />
                        </div>
                        {item.observaciones && (
                            <p className="whitespace-pre-line text-sm text-muted-foreground">{item.observaciones}</p>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => toggle(item._id)} className="justify-start">
                            <ChevronDown
                                className={cn('size-4 transition-transform', open === item._id && 'rotate-180')}
                            />
                            {item.lines.length} líneas
                        </Button>
                        {open === item._id && <Lines item={item} />}
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-8" />
                        <TableHead>Fecha</TableHead>
                        <TableHead>Administración</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Doy</TableHead>
                        <TableHead className="text-right">Recibo</TableHead>
                        <TableHead>Sobres</TableHead>
                        <TableHead>Nueva versión</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item) => {
                        const expanded = open === item._id;
                        return (
                            <Fragment key={item._id}>
                                <TableRow className="cursor-pointer" onClick={() => toggle(item._id)}>
                                    <TableCell>
                                        <ChevronDown
                                            className={cn(
                                                'size-4 text-muted-foreground transition-transform',
                                                expanded && 'rotate-180',
                                            )}
                                        />
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">{formatDate(item.fecha)}</TableCell>
                                    <TableCell className="max-w-72">
                                        <Counterpart item={item} />
                                    </TableCell>
                                    <TableCell>
                                        <EstadoBadge estado={item.estado} />
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">
                                        {formatBilletes(item.decimosOut)}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">
                                        {formatBilletes(item.decimosIn)}
                                    </TableCell>
                                    <TableCell>
                                        <EnvelopeChecks envelope={item.envelope} />
                                    </TableCell>
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <MigratedLinks item={item} />
                                    </TableCell>
                                </TableRow>
                                {expanded && (
                                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                                        <TableCell />
                                        <TableCell colSpan={7} className="space-y-3 py-3">
                                            {item.observaciones && (
                                                <p className="whitespace-pre-line text-sm">
                                                    <span className="text-muted-foreground">Observaciones: </span>
                                                    {item.observaciones}
                                                </p>
                                            )}
                                            <Lines item={item} />
                                        </TableCell>
                                    </TableRow>
                                )}
                            </Fragment>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
