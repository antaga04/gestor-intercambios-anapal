import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { changePasswordSchema } from '@anapal/shared';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PasswordInput } from '@/features/auth/components/PasswordInput';
import { useAuth } from '@/features/auth/hooks';
import { usersApi } from '@/features/users/api';
import { handleFormError } from '@/lib/forms';
import { t } from '@/lib/messages';

const formSchema = changePasswordSchema
    .innerType()
    .extend({ confirmPassword: z.string() })
    .refine((v) => v.currentPassword !== v.newPassword, {
        path: ['newPassword'],
        message: 'La nueva contraseña debe ser distinta de la actual',
    })
    .refine((v) => v.newPassword === v.confirmPassword, {
        path: ['confirmPassword'],
        message: 'Las contraseñas no coinciden',
    });
type Values = z.infer<typeof formSchema>;

export function ChangePasswordForm() {
    const { refetchMe } = useAuth();
    const form = useForm<Values>({
        resolver: zodResolver(formSchema),
        defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    });

    const onSubmit = form.handleSubmit(async ({ currentPassword, newPassword }) => {
        try {
            const { code } = await usersApi.changePassword({ currentPassword, newPassword });
            toast.success(t(code));
            form.reset();
            await refetchMe();
        } catch (err) {
            handleFormError(err, form.setError);
        }
    });

    return (
        <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <FormField
                    control={form.control}
                    name="currentPassword"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Contraseña actual</FormLabel>
                            <FormControl>
                                <PasswordInput autoComplete="current-password" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nueva contraseña</FormLabel>
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
                            <FormLabel>Repite la nueva contraseña</FormLabel>
                            <FormControl>
                                <PasswordInput autoComplete="new-password" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="flex justify-end">
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        Cambiar contraseña
                    </Button>
                </div>
            </form>
        </Form>
    );
}
