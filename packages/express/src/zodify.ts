import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";

type Zodifiable<P, Q, B, R> = {
  params?: ZodSchema<P>;
  query?: ZodSchema<Q>;
  body?: ZodSchema<B>;
  response?: ZodSchema<R>;
};
export const zodify = <P, Q, B, R>(
  schema: Zodifiable<P, Q, B, R>,
  handler: (
    req: Request<P, R, B, Q>,
    res: Response<R>,
    next: NextFunction,
  ) => void,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    schema.body?.parse(req.body);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return handler(req as any, res, next);
  };
};
