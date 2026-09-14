import { useId, useMemo, useState } from 'react';
import type { AdminStats } from '@anapal/shared';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/format';

type Point = AdminStats['exchangesPerDay'][number];

/** Categorical pair validated with the dataviz palette checks (light / dark). */
const SERIES = [
    { key: 'created', label: 'Creados', light: '#e85d1a', dark: '#e06426' },
    { key: 'accepted', label: 'Aceptados', light: '#2a78d6', dark: '#3987e5' },
] as const;

const W = 640;
const H = 220;
const PAD = { top: 12, right: 12, bottom: 28, left: 32 };

/**
 * Exchanges created / accepted per day (last 60 days). Inline SVG: two thin lines, a hover
 * crosshair with a tooltip, a legend and a table view for screen readers and exports.
 */
export function ExchangesChart({ data }: { data: Point[] }) {
    const [hover, setHover] = useState<number | null>(null);
    const [showTable, setShowTable] = useState(false);
    const id = useId();

    const { max, xs, paths } = useMemo(() => {
        const maxValue = Math.max(1, ...data.map((d) => Math.max(d.created, d.accepted)));
        const innerW = W - PAD.left - PAD.right;
        const innerH = H - PAD.top - PAD.bottom;
        const x = (i: number) => PAD.left + (data.length > 1 ? (i / (data.length - 1)) * innerW : innerW / 2);
        const y = (v: number) => PAD.top + innerH - (v / maxValue) * innerH;
        const line = (key: 'created' | 'accepted') =>
            data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(' ');
        return {
            max: maxValue,
            xs: data.map((_, i) => x(i)),
            paths: { created: line('created'), accepted: line('accepted'), y },
        };
    }, [data]);

    const ticks = useMemo(() => {
        const step = max <= 5 ? 1 : Math.ceil(max / 4);
        const values: number[] = [];
        for (let v = 0; v <= max; v += step) values.push(v);
        return values;
    }, [max]);

    const onMove = (event: React.MouseEvent<SVGSVGElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const px = ((event.clientX - rect.left) / rect.width) * W;
        let nearest = 0;
        for (let i = 1; i < xs.length; i++) if (Math.abs(xs[i] - px) < Math.abs(xs[nearest] - px)) nearest = i;
        setHover(nearest);
    };

    const point = hover !== null ? data[hover] : null;
    const total = data.reduce((acc, d) => ({ created: acc.created + d.created, accepted: acc.accepted + d.accepted }), {
        created: 0,
        accepted: 0,
    });

    return (
        <div className="space-y-3">
            <style>{`
                #${CSS.escape(id)} { --s-created: ${SERIES[0].light}; --s-accepted: ${SERIES[1].light}; }
                .dark #${CSS.escape(id)} { --s-created: ${SERIES[0].dark}; --s-accepted: ${SERIES[1].dark}; }
            `}</style>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <ul className="flex flex-wrap gap-4" aria-label="Series">
                    {SERIES.map((s) => (
                        <li key={s.key} className="flex items-center gap-2">
                            <span
                                className="inline-block h-0.5 w-4 rounded-full"
                                style={{ background: `var(--s-${s.key})` }}
                                aria-hidden
                            />
                            <span className="text-muted-foreground">{s.label}</span>
                            <span className="font-medium tabular-nums">{total[s.key]}</span>
                        </li>
                    ))}
                </ul>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowTable((v) => !v)}>
                    {showTable ? 'Ver gráfico' : 'Ver tabla'}
                </Button>
            </div>

            {showTable ? (
                <div className="max-h-72 overflow-auto rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Día</TableHead>
                                <TableHead className="text-right">Creados</TableHead>
                                <TableHead className="text-right">Aceptados</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...data].reverse().map((d) => (
                                <TableRow key={d.date}>
                                    <TableCell>{formatDate(d.date)}</TableCell>
                                    <TableCell className="text-right tabular-nums">{d.created}</TableCell>
                                    <TableCell className="text-right tabular-nums">{d.accepted}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <div id={id} className="relative">
                    <svg
                        viewBox={`0 0 ${W} ${H}`}
                        className="h-auto w-full"
                        role="img"
                        aria-label={`Intercambios por día: ${total.created} creados y ${total.accepted} aceptados en los últimos ${data.length} días`}
                        onMouseMove={onMove}
                        onMouseLeave={() => setHover(null)}
                    >
                        {ticks.map((v) => (
                            <g key={v}>
                                <line
                                    x1={PAD.left}
                                    x2={W - PAD.right}
                                    y1={paths.y(v)}
                                    y2={paths.y(v)}
                                    className="stroke-border"
                                    strokeWidth={v === 0 ? 1 : 0.5}
                                />
                                <text
                                    x={PAD.left - 6}
                                    y={paths.y(v) + 3}
                                    textAnchor="end"
                                    className="fill-muted-foreground text-[10px]"
                                >
                                    {v}
                                </text>
                            </g>
                        ))}
                        {data.length > 0 &&
                            [0, Math.floor((data.length - 1) / 2), data.length - 1].map((i) => (
                                <text
                                    key={i}
                                    x={xs[i]}
                                    y={H - 8}
                                    textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}
                                    className="fill-muted-foreground text-[10px]"
                                >
                                    {formatDate(data[i].date)}
                                </text>
                            ))}
                        <path
                            d={paths.created}
                            fill="none"
                            stroke="var(--s-created)"
                            strokeWidth={2}
                            strokeLinejoin="round"
                        />
                        <path
                            d={paths.accepted}
                            fill="none"
                            stroke="var(--s-accepted)"
                            strokeWidth={2}
                            strokeLinejoin="round"
                        />
                        {hover !== null && point && (
                            <g>
                                <line
                                    x1={xs[hover]}
                                    x2={xs[hover]}
                                    y1={PAD.top}
                                    y2={H - PAD.bottom}
                                    className="stroke-muted-foreground"
                                    strokeDasharray="3 3"
                                />
                                {SERIES.map((s) => (
                                    <circle
                                        key={s.key}
                                        cx={xs[hover]}
                                        cy={paths.y(point[s.key])}
                                        r={4}
                                        fill={`var(--s-${s.key})`}
                                        className="stroke-background"
                                        strokeWidth={2}
                                    />
                                ))}
                            </g>
                        )}
                    </svg>
                    {hover !== null && point && (
                        <div
                            className="pointer-events-none absolute top-2 rounded-md border bg-popover px-3 py-2 text-xs shadow-md"
                            style={{
                                left: `${(xs[hover] / W) * 100}%`,
                                transform: xs[hover] > W / 2 ? 'translateX(calc(-100% - 8px))' : 'translateX(8px)',
                            }}
                        >
                            <p className="font-medium">{formatDate(point.date)}</p>
                            {SERIES.map((s) => (
                                <p key={s.key} className="flex items-center gap-2 text-muted-foreground">
                                    <span
                                        className="inline-block size-2 rounded-full"
                                        style={{ background: `var(--s-${s.key})` }}
                                    />
                                    {s.label}:{' '}
                                    <span className="font-medium text-foreground tabular-nums">{point[s.key]}</span>
                                </p>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
