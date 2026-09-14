import type { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/** Express 5 forwards rejected promises to the error handler; this keeps handlers typed and explicit. */
export const asyncHandler =
    (fn: AsyncRequestHandler): RequestHandler =>
    (req, res, next) => {
        fn(req, res, next).catch(next);
    };
