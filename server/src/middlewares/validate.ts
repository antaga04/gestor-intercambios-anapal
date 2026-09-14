import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodTypeAny } from 'zod';

interface ValidateSchemas {
    body?: ZodTypeAny;
    query?: ZodTypeAny;
    params?: ZodTypeAny;
}

/**
 * Validates and replaces `req.body` / `req.params`; the parsed query goes to `req.validatedQuery`
 * because Express 5 exposes `req.query` as a read-only getter. Zod errors reach the error handler as 400.
 */
export function validate(schemas: ValidateSchemas): RequestHandler {
    return (req: Request, _res: Response, next: NextFunction) => {
        try {
            if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
            if (schemas.query) req.validatedQuery = schemas.query.parse(req.query ?? {});
            if (schemas.params) req.params = schemas.params.parse(req.params);
            next();
        } catch (err) {
            next(err);
        }
    };
}

export function getQuery<T>(req: Request): T {
    return req.validatedQuery as T;
}
