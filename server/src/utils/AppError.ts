/** Operational error carrying an HTTP status and a stable `i18n` code the client can translate. */
export class AppError extends Error {
    constructor(
        public readonly status: number,
        public readonly i18n: string,
        message: string,
        public readonly errors?: unknown,
    ) {
        super(message);
        this.name = 'AppError';
    }
}
