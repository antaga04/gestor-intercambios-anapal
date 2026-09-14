import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { profileFieldsSchema, receptorNumberSchema, type AdminUser } from '@anapal/shared';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useUpdateAdminUser } from '@/features/admin/hooks';
import { ProvinciaSelect } from '@/features/auth/components/ProvinciaSelect';
import { handleFormError } from '@/lib/forms';
import { t } from '@/lib/messages';

const schema = z.object({
    receptorNumber: receptorNumberSchema,
    name: profileFieldsSchema.shape.name,
    poblacion: profileFieldsSchema.shape.poblacion,
    provincia: profileFieldsSchema.shape.provincia,
    address: z.string().trim().max(160),
    phone: z.string().trim().max(20),
    contactName: z.string().trim().max(80),
});
type Values = z.infer<typeof schema>;

/** Lets an admin fix a user's public data (typos in the receptor number, name, población…). */
export function AdminUserForm({ user }: { user: AdminUser }) {
    const update = useUpdateAdminUser();
    const form = useForm<Values>({
        resolver: zodResolver(schema),
        values: {
            receptorNumber: user.receptorNumber,
            name: user.name,
            poblacion: user.poblacion,
            provincia: user.provincia,
            address: user.address ?? '',
            phone: user.phone ?? '',
            contactName: user.contactName ?? '',
        },
    });

    const onSubmit = form.handleSubmit(async (values) => {
        try {
            const { code } = await update.mutateAsync({
                id: user._id,
                body: {
                    ...values,
                    address: values.address || undefined,
                    phone: values.phone || undefined,
                    contactName: values.contactName || undefined,
                },
            });
            toast.success(t(code));
        } catch (err) {
            handleFormError(err, form.setError);
        }
    });

    const text = (name: keyof Values, label: string, extra?: Partial<React.ComponentProps<typeof Input>>) => (
        <FormField
            control={form.control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                        <Input {...extra} {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    );

    return (
        <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
                    {text('receptorNumber', 'Nº de receptor', { inputMode: 'numeric', className: 'font-mono' })}
                    {text('name', 'Nombre de la administración')}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    {text('poblacion', 'Población')}
                    <FormField
                        control={form.control}
                        name="provincia"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Provincia</FormLabel>
                                <FormControl>
                                    <ProvinciaSelect value={field.value} onChange={field.onChange} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                {text('address', 'Dirección')}
                <div className="grid gap-4 sm:grid-cols-2">
                    {text('phone', 'Teléfono', { inputMode: 'tel' })}
                    {text('contactName', 'Persona de contacto')}
                </div>
                <div className="flex justify-end">
                    <Button type="submit" disabled={update.isPending || !form.formState.isDirty}>
                        Guardar cambios
                    </Button>
                </div>
            </form>
        </Form>
    );
}
