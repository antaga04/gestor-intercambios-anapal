import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { emailOnlySchema, type EmailOnlyInput } from '@anapal/shared';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { handleFormError } from '@/lib/forms';

interface EmailOnlyFormProps {
    submitLabel: string;
    onSubmit: (values: EmailOnlyInput) => Promise<void>;
}

export function EmailOnlyForm({ submitLabel, onSubmit }: EmailOnlyFormProps) {
    const form = useForm<EmailOnlyInput>({ resolver: zodResolver(emailOnlySchema), defaultValues: { email: '' } });

    const submit = form.handleSubmit(async (values) => {
        try {
            await onSubmit(values);
        } catch (err) {
            handleFormError(err, form.setError);
        }
    });

    return (
        <Form {...form}>
            <form onSubmit={submit} className="space-y-4" noValidate>
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input type="email" autoComplete="email" inputMode="email" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                    {submitLabel}
                </Button>
            </form>
        </Form>
    );
}
