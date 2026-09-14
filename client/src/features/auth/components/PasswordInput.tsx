import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function PasswordInput(props: React.ComponentProps<typeof Input>) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
            <Input type={show ? 'text' : 'password'} autoComplete="current-password" {...props} className="pr-10" />
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-1/2 right-1 size-7 -translate-y-1/2 text-muted-foreground"
                aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                onClick={() => setShow((v) => !v)}
                tabIndex={-1}
            >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
        </div>
    );
}
