import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'system';
type Resolved = 'light' | 'dark';

interface ThemeContextValue {
    theme: Theme;
    resolvedTheme: Resolved;
    setTheme: (theme: Theme) => void;
}

const STORAGE_KEY = 'theme';
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const systemTheme = (): Resolved => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

function readStored(): Theme {
    try {
        const v = localStorage.getItem(STORAGE_KEY);
        return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
    } catch {
        return 'system';
    }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(readStored);
    const [system, setSystem] = useState<Resolved>(systemTheme);

    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const onChange = () => setSystem(systemTheme());
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    const resolvedTheme: Resolved = theme === 'system' ? system : theme;

    useEffect(() => {
        const root = document.documentElement;
        root.classList.toggle('dark', resolvedTheme === 'dark');
        root.style.colorScheme = resolvedTheme;
    }, [resolvedTheme]);

    const setTheme = useCallback((next: Theme) => {
        setThemeState(next);
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            /* ignore */
        }
    }, []);

    const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme, setTheme]);
    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
    return ctx;
}
