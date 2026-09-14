import { resolveMessage } from '@anapal/shared';

/** Spanish text for an API `i18n` code. */
export const t = (code: string | undefined | null, fallback?: string) => resolveMessage(code, fallback);
