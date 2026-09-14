import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { toast } from 'sonner';
import { ApiClientError } from '@/lib/api';

/**
 * Maps server-side zod issues onto form fields; falls back to a toast for anything else.
 * Returns true when the error was handled as field errors.
 */
export function handleFormError<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>): boolean {
    if (error instanceof ApiClientError) {
        if (error.code === 'validation.failed' && error.fieldErrors.length > 0) {
            for (const issue of error.fieldErrors) {
                if (issue.path) setError(issue.path as Path<T>, { type: 'server', message: issue.message });
            }
            return true;
        }
        toast.error(error.message);
        return false;
    }
    toast.error('Ha ocurrido un error inesperado.');
    return false;
}
