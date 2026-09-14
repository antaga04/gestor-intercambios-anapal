import { cn } from '@/lib/utils';

export function Logo({ className, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
    return <img src="/logotipo.png" alt="ANAPAL" className={cn('h-10 w-auto', className)} {...props} />;
}
