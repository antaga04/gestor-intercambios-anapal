import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { LoginInput, MeUser } from '@anapal/shared';
import { authApi } from '@/features/auth/api';
import { clearSession, HAS_SESSION_KEY } from '@/lib/api';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AuthContextValue {
    user: MeUser | null;
    status: AuthStatus;
    login: (input: LoginInput) => Promise<MeUser>;
    logout: () => Promise<void>;
    refetchMe: () => Promise<void>;
    setUser: (user: MeUser) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function hasSessionFlag(): boolean {
    try {
        return localStorage.getItem(HAS_SESSION_KEY) === 'true';
    } catch {
        return false;
    }
}

function setSessionFlag() {
    try {
        localStorage.setItem(HAS_SESSION_KEY, 'true');
    } catch {
        /* ignore */
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient();
    const [user, setUser] = useState<MeUser | null>(null);
    const [status, setStatus] = useState<AuthStatus>(hasSessionFlag() ? 'loading' : 'anonymous');

    const refetchMe = useCallback(async () => {
        try {
            const me = await authApi.me();
            setUser(me);
            setStatus('authenticated');
            setSessionFlag();
        } catch {
            clearSession();
            setUser(null);
            setStatus('anonymous');
        }
    }, []);

    useEffect(() => {
        if (hasSessionFlag()) void refetchMe();
    }, [refetchMe]);

    // Keep role/status fresh when the tab regains focus.
    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState === 'visible' && hasSessionFlag()) void refetchMe();
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, [refetchMe]);

    const login = useCallback(async (input: LoginInput) => {
        const me = await authApi.login(input);
        setSessionFlag();
        setUser(me);
        setStatus('authenticated');
        return me;
    }, []);

    const logout = useCallback(async () => {
        try {
            await authApi.logout();
        } finally {
            clearSession();
            queryClient.clear();
            setUser(null);
            setStatus('anonymous');
        }
    }, [queryClient]);

    const value = useMemo<AuthContextValue>(
        () => ({ user, status, login, logout, refetchMe, setUser }),
        [user, status, login, logout, refetchMe],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
