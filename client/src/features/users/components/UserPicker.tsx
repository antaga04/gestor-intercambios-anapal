import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Loader2, Search } from 'lucide-react';
import type { PublicUser } from '@anapal/shared';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useUserDirectory } from '@/features/users/hooks';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

interface UserPickerProps {
    value?: PublicUser | null;
    onChange: (user: PublicUser) => void;
    disabled?: boolean;
    placeholder?: string;
}

/** Searchable picker over the public directory (nº de receptor, nombre or población). */
export function UserPicker({ value, onChange, disabled, placeholder = 'Busca una administración…' }: UserPickerProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const debounced = useDebounce(search.trim(), 300);
    const params = useMemo(() => ({ q: debounced || undefined, limit: 20 }), [debounced]);
    const { data, isFetching } = useUserDirectory(params, open);
    const items = data?.items ?? [];

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className="w-full justify-between font-normal"
                >
                    {value ? (
                        <span className="flex min-w-0 items-center gap-2">
                            <Badge variant="secondary" className="font-mono">
                                Nº {value.receptorNumber}
                            </Badge>
                            <span className="truncate">{value.name}</span>
                        </span>
                    ) : (
                        <span className="flex items-center gap-2 text-muted-foreground">
                            <Search className="size-4" /> {placeholder}
                        </span>
                    )}
                    <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="Nº de receptor, nombre o población…"
                        value={search}
                        onValueChange={setSearch}
                    />
                    <CommandList>
                        {isFetching && items.length === 0 ? (
                            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                                <Loader2 className="size-4 animate-spin" /> Buscando…
                            </div>
                        ) : (
                            <CommandEmpty>No se ha encontrado ninguna administración.</CommandEmpty>
                        )}
                        <CommandGroup>
                            {items.map((user) => (
                                <CommandItem
                                    key={user._id}
                                    value={user._id}
                                    onSelect={() => {
                                        onChange(user);
                                        setOpen(false);
                                    }}
                                    className="gap-2"
                                >
                                    <Check
                                        className={cn('size-4', value?._id === user._id ? 'opacity-100' : 'opacity-0')}
                                    />
                                    <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
                                        {user.receptorNumber}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate">{user.name}</span>
                                        <span className="block truncate text-xs text-muted-foreground">
                                            {user.poblacion} ({user.provincia})
                                        </span>
                                    </span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
