import { Handler, NextFunction, Request, Response } from "express";
import { ZodError, ZodSchema } from "zod";
import {
  BadRequestError,
  InternalServerError,
  ServerError,
  UnauthorizedError,
} from "./errors";
import { logError } from "./logError";
import {
  validateSession,
  extendSession,
} from "@recipesage/util/server/general";
import { Session } from "@prisma/client";

const handleServerError = (e: unknown, res: Response) => {
  if (e instanceof ServerError) {
    logError(e);

    if (process.env.NODE_ENV !== "production") {
      res.status(e.status).send(e);
    } else {
      res.status(e.status).send(e.name);
    }
  } else {
    logError(e);

    if (process.env.NODE_ENV !== "production") {
      res.status(500).send(e);
    } else {
      res.status(500).send("Internal server error");
    }
  }
};

export enum AuthenticationEnforcement {
  Required = "required",
  Optional = "optional",
  None = "none",
}
type SessionPresent = {
  [AuthenticationEnforcement.Required]: Session;
  [AuthenticationEnforcement.Optional]: Session | undefined;
  [AuthenticationEnforcement.None]: undefined;
};
type Zodifiable<P, Q, B, R> = {
  params?: ZodSchema<P>;
  query?: ZodSchema<Q>;
  body?: ZodSchema<B>;
  response?: ZodSchema<R>;
};
interface HandlerResult {
  statusCode: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}
export const defineHandler = <
  GParams,
  GQuery,
  GBody,
  GResponse,
  GAuthentication extends AuthenticationEnforcement,
>(
  opts: {
    schema: Zodifiable<GParams, GQuery, GBody, GResponse>;
    authentication: GAuthentication;
    beforeHandlers?: Handler[];
    afterHandlers?: Handler[];
  },
  handler: (
    req: Request<GParams, GResponse, GBody, GQuery>,
    res: Response<
      GResponse,
      {
        session: SessionPresent[GAuthentication];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        unsafeStorage: any;
      }
    >,
    next: NextFunction,
  ) => Promise<HandlerResult | void>,
) => {
  return [
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        try {
          opts.schema.params?.parse(req.params);
          opts.schema.query?.parse(req.query);
          opts.schema.body?.parse(req.body);
        } catch (e) {
          if (e instanceof ZodError) {
            throw new BadRequestError(e.message);
          }
          throw new InternalServerError("Unknown error parsing request");
        }

        let session: Session | undefined;
        if (opts.authentication !== AuthenticationEnforcement.None) {
          const authorization = req.headers.authorization;
          if (
            opts.authentication === AuthenticationEnforcement.Required &&
            !authorization
          ) {
            throw new UnauthorizedError(
              "You must pass an authorization header",
            );
          }

          if (authorization) {
            const authorizationParts = authorization.split(" ");
            const token = authorizationParts.at(1);
            session = token ? await validateSession(token) : undefined;
            if (session) extendSession(session);

            if (
              opts.authentication === AuthenticationEnforcement.Required &&
              !session
            ) {
              throw new UnauthorizedError("Token is not valid");
            }
          }
        }

        res.locals.session = session;

        next();
      } catch (e) {
        handleServerError(e, res);
      }
    },
    ...(opts.beforeHandlers || []),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await handler(req as any, res as any, next);

        if (result) {
          res.status(result.statusCode).send(result.data);
        }
      } catch (e) {
        handleServerError(e, res);
      }
    },
    ...(opts.afterHandlers || []),
  ];
};
