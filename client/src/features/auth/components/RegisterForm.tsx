import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { registerSchema } from '@anapal/shared';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/features/auth/components/PasswordInput';
import { ProvinciaSelect } from '@/features/auth/components/ProvinciaSelect';
import { authApi } from '@/features/auth/api';
import { handleFormError } from '@/lib/forms';

const formSchema = registerSchema
    .extend({ confirmPassword: z.string() })
    .refine((v) => v.password === v.confirmPassword, {
        path: ['confirmPassword'],
        message: 'Las contraseñas no coinciden',
    });
type FormValues = z.infer<typeof formSchema>;

interface RegisterFormProps {
    onRegistered: (result: { email: string; emailSent: boolean }) => void;
}

export function RegisterForm({ onRegistered }: RegisterFormProps) {
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
            password: '',
            confirmPassword: '',
            receptorNumber: '',
            name: '',
            poblacion: '',
            provincia: '',
            address: '',
            phone: '',
            contactName: '',
        },
    });

    const onSubmit = form.handleSubmit(async (values) => {
        const body = {
            ...values,
            confirmPassword: undefined,
            address: values.address || undefined,
            phone: values.phone || undefined,
            contactName: values.contactName || undefined,
        };
        try {
            const { payload } = await authApi.register(body);
            onRegistered(payload);
        } catch (err) {
            handleFormError(err, form.setError);
        }
    });

    const text = (
        name: keyof FormValues,
        label: string,
        extra?: Partial<React.ComponentProps<typeof Input>>,
        description?: string,
    ) => (
        <FormField
            control={form.control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                        <Input {...extra} {...field} />
                    </FormControl>
                    {description && <FormDescription>{description}</FormDescription>}
                    <FormMessage />
                </FormItem>
            )}
        />
    );

    return (
        <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-6" noValidate>
                <section className="space-y-4">
                    <h2 className="text-sm font-semibold text-muted-foreground">Acceso</h2>
                    {text('email', 'Email', { type: 'email', autoComplete: 'email', inputMode: 'email' })}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Contraseña</FormLabel>
                                    <FormControl>
                                        <PasswordInput autoComplete="new-password" {...field} />
                                    </FormControl>
                                    <FormDescription>Mínimo 8 caracteres, con letras y números.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Repite la contraseña</FormLabel>
                                    <FormControl>
                                        <PasswordInput autoComplete="new-password" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-sm font-semibold text-muted-foreground">Administración</h2>
                    <p className="text-xs text-muted-foreground">
                        Estos datos los verán otras administraciones y se imprimen en los sobres.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
                        {text('receptorNumber', 'Nº de receptor', { inputMode: 'numeric', autoComplete: 'off' })}
                        {text('name', 'Nombre de la administración', { placeholder: 'Administración nº 12 – …' })}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {text('poblacion', 'Población', { autoComplete: 'address-level2' })}
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
                    {text('address', 'Dirección (opcional)', { autoComplete: 'street-address' })}
                    <div className="grid gap-4 sm:grid-cols-2">
                        {text('phone', 'Teléfono (opcional)', { type: 'tel', autoComplete: 'tel', inputMode: 'tel' })}
                        {text('contactName', 'Persona de contacto (opcional)', { autoComplete: 'name' })}
                    </div>
                </section>

                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                    Crear cuenta
                </Button>
            </form>
        </Form>
    );
}
