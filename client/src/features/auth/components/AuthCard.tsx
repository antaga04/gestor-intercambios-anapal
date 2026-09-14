import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/common/Logo';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

interface AuthCardProps {
    title: string;
    description?: string;
    children: ReactNode;
    footer?: ReactNode;
    wide?: boolean;
}

export function AuthCard({ title, description, children, footer, wide }: AuthCardProps) {
    useDocumentTitle(title);
    return (
        <div className="flex justify-center py-4">
            <Card className={wide ? 'w-full max-w-2xl' : 'w-full max-w-md'}>
                <CardHeader className="items-center text-center">
                    <Logo className="mx-auto mb-2 h-12" />
                    <CardTitle className="text-xl">{title}</CardTitle>
                    {description && <CardDescription>{description}</CardDescription>}
                </CardHeader>
                <CardContent>{children}</CardContent>
                {footer && <CardFooter className="justify-center text-sm text-muted-foreground">{footer}</CardFooter>}
            </Card>
        </div>
    );
}
