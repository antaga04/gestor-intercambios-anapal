import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import type { Campaign } from '@anapal/shared';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateCampaign, useUpdateCampaign } from '@/features/admin/hooks';
import { handleFormError } from '@/lib/forms';
import { t } from '@/lib/messages';

/** Dates come from `<input type="date">` as yyyy-MM-dd. */
const formSchema = z
    .object({
        name: z.string().trim().min(3, 'Mínimo 3 caracteres').max(80),
        drawDate: z.string().min(1, 'Indica la fecha del sorteo'),
        exchangeDeadline: z.string().min(1, 'Indica la fecha límite'),
        isActive: z.boolean(),
        landingText: z.string().max(4000),
        barcodeDayDigit: z.enum(['', '5', '6']),
        barcodeJornada: z.string().regex(/^\d{0,3}$/, 'Solo dígitos (máx. 3)'),
    })
    .refine((v) => v.exchangeDeadline <= v.drawDate, {
        path: ['exchangeDeadline'],
        message: 'La fecha límite debe ser anterior o igual a la del sorteo',
    })
    .refine((v) => (v.barcodeDayDigit === '') === (v.barcodeJornada === ''), {
        path: ['barcodeJornada'],
        message: 'Indica el día y la jornada, o deja ambos vacíos',
    });
type Values = z.infer<typeof formSchema>;

const toDateInput = (iso?: string) => (iso ? iso.slice(0, 10) : '');

interface CampaignFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    campaign?: Campaign | null;
}

export function CampaignFormDialog({ open, onOpenChange, campaign }: CampaignFormDialogProps) {
    const create = useCreateCampaign();
    const update = useUpdateCampaign();
    const editing = !!campaign;

    const form = useForm<Values>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            drawDate: '',
            exchangeDeadline: '',
            isActive: false,
            landingText: '',
            barcodeDayDigit: '',
            barcodeJornada: '',
        },
    });

    useEffect(() => {
        if (!open) return;
        form.reset({
            name: campaign?.name ?? '',
            drawDate: toDateInput(campaign?.drawDate),
            exchangeDeadline: toDateInput(campaign?.exchangeDeadline),
            isActive: campaign?.isActive ?? false,
            landingText: campaign?.landingText ?? '',
            barcodeDayDigit: campaign?.barcode?.dayDigit ?? '',
            barcodeJornada: campaign?.barcode?.jornada ?? '',
        });
    }, [open, campaign, form]);

    const onSubmit = form.handleSubmit(async (values) => {
        const barcode = values.barcodeDayDigit
            ? { dayDigit: values.barcodeDayDigit, jornada: values.barcodeJornada }
            : null;
        const body = {
            name: values.name,
            drawDate: new Date(values.drawDate).toISOString(),
            exchangeDeadline: new Date(values.exchangeDeadline).toISOString(),
            isActive: values.isActive,
            landingText: values.landingText || null,
            barcode,
        };
        try {
            if (editing) {
                const { code } = await update.mutateAsync({ id: campaign._id, body });
                toast.success(t(code));
            } else {
                const { code } = await create.mutateAsync({
                    ...body,
                    landingText: values.landingText || undefined,
                    barcode: barcode ?? undefined,
                });
                toast.success(t(code));
            }
            onOpenChange(false);
        } catch (err) {
            handleFormError(err, form.setError);
        }
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{editing ? 'Editar campaña' : 'Nueva campaña'}</DialogTitle>
                    <DialogDescription>
                        Los intercambios, la lotería importada y las estadísticas pertenecen a una campaña.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={onSubmit} className="space-y-4" noValidate>
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Navidad 2027" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid gap-4 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="drawDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fecha del sorteo</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="exchangeDeadline"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fecha límite de intercambio</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="barcodeDayDigit"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Día del sorteo (código de barras)</FormLabel>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Sin comprobación" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="6">Jueves (6)</SelectItem>
                                                <SelectItem value="5">Sábado (5)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="barcodeJornada"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Jornada</FormLabel>
                                        <FormControl>
                                            <Input inputMode="numeric" placeholder="102" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Se usa para avisar si un décimo escaneado no es del sorteo.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="landingText"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Texto de la portada</FormLabel>
                                    <FormControl>
                                        <Textarea rows={4} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="isActive"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start gap-3 rounded-md border p-3">
                                    <FormControl>
                                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                    <div className="space-y-1">
                                        <FormLabel>Campaña activa</FormLabel>
                                        <FormDescription>
                                            Al activarla se desactivará la campaña actual. Los intercambios existentes
                                            no se modifican.
                                        </FormDescription>
                                    </div>
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {editing ? 'Guardar cambios' : 'Crear campaña'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
