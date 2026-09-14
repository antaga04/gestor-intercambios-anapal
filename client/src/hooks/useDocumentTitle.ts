import { useEffect } from 'react';

const SUFFIX = 'Intercambios ANAPAL';

export function useDocumentTitle(title?: string) {
    useEffect(() => {
        document.title = title ? `${title} · ${SUFFIX}` : SUFFIX;
        return () => {
            document.title = SUFFIX;
        };
    }, [title]);
}
