import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { LIMITS } from '@anapal/shared';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAddLotteryNumber } from '@/features/lottery/hooks';
import { handleFormError } from '@/lib/forms';
import { t } from '@/lib/messages';

const serie = z
    .string()
    .trim()
    .refine((v) => v === '' || (/^\d{1,3}$/.test(v) && +v >= LIMITS.serieMin && +v <= LIMITS.serieMax), {
        message: `Entre ${LIMITS.serieMin} y ${LIMITS.serieMax}`,
    });

const formSchema = z
    .object({
        numero: z
            .string()
            .trim()
            .regex(/^\d{1,5}$/, 'Entre 1 y 5 dígitos'),
        serieFrom: serie,
        serieTo: serie,
    })
    .refine((v) => !(v.serieTo && !v.serieFrom), { path: ['serieFrom'], message: 'Indica la serie inicial' })
    .refine((v) => !(v.serieFrom && v.serieTo) || +v.serieFrom <= +v.serieTo, {
        path: ['serieTo'],
        message: 'Debe ser mayor o igual que la inicial',
    });
type Values = z.infer<typeof formSchema>;

export function AddNumberForm() {
    const add = useAddLotteryNumber();
    const form = useForm<Values>({
        resolver: zodResolver(formSchema),
        defaultValues: { numero: '', serieFrom: '', serieTo: '' },
    });

    const onSubmit = form.handleSubmit(async (values) => {
        const from = values.serieFrom ? Number(values.serieFrom) : undefined;
        const to = values.serieTo ? Number(values.serieTo) : from;
        try {
            const { code } = await add.mutateAsync({
                numero: values.numero.padStart(LIMITS.numeroLength, '0'),
                series: from !== undefined ? [{ from, to: to! }] : undefined,
            });
            toast.success(t(code));
            form.reset();
            form.setFocus('numero');
        } catch (err) {
            handleFormError(err, form.setError);
        }
    });

    return (
        <Form {...form}>
            <form onSubmit={onSubmit} className="flex flex-wrap items-start gap-3">
                <FormField
                    control={form.control}
                    name="numero"
                    render={({ field }) => (
                        <FormItem className="w-32">
                            <FormLabel>Número</FormLabel>
                            <FormControl>
                                <Input inputMode="numeric" maxLength={5} placeholder="12345" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="serieFrom"
                    render={({ field }) => (
                        <FormItem className="w-28">
                            <FormLabel>Serie desde</FormLabel>
                            <FormControl>
                                <Input inputMode="numeric" maxLength={3} placeholder="opcional" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="serieTo"
                    render={({ field }) => (
                        <FormItem className="w-28">
                            <FormLabel>Serie hasta</FormLabel>
                            <FormControl>
                                <Input inputMode="numeric" maxLength={3} placeholder="opcional" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="mt-6" disabled={form.formState.isSubmitting}>
                    <Plus /> Añadir
                </Button>
            </form>
        </Form>
    );
}
