import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { loginSchema, type LoginInput } from '@anapal/shared';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/features/auth/components/PasswordInput';
import { useAuth } from '@/features/auth/hooks';
import { ApiClientError } from '@/lib/api';
import { handleFormError } from '@/lib/forms';

export function LoginForm() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = (location.state as { from?: string } | null)?.from;

    const form = useForm<LoginInput>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' },
    });

    const onSubmit = form.handleSubmit(async (values) => {
        try {
            const me = await login(values);
            toast.success(`Hola, ${me.name}`);
            navigate(from && from !== '/login' ? from : '/dashboard', { replace: true });
        } catch (err) {
            if (err instanceof ApiClientError && err.code === 'auth.email_not_verified') {
                toast.warning(err.message, {
                    action: { label: 'Reenviar email', onClick: () => navigate('/reenviar-verificacion') },
                });
                return;
            }
            handleFormError(err, form.setError);
        }
    });

    return (
        <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input
                                    type="email"
                                    autoComplete="email"
                                    inputMode="email"
                                    placeholder="tu@email.com"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center justify-between">
                                <FormLabel>Contraseña</FormLabel>
                                <Link
                                    to="/olvide-contrasena"
                                    className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                                >
                                    ¿Has olvidado la contraseña?
                                </Link>
                            </div>
                            <FormControl>
                                <PasswordInput {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                    Entrar
                </Button>
            </form>
        </Form>
    );
}
