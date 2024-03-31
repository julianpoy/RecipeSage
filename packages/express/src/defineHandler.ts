import { NextFunction, Request, Response } from "express";
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
  },
  handler: (
    req: Request<GParams, GResponse, GBody, GQuery>,
    res: Response<
      GResponse,
      {
        session: SessionPresent[GAuthentication];
      }
    >,
    next: NextFunction,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) => any,
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      try {
        opts.schema.params?.parse(req.params);
        opts.schema.query?.parse(req.params);
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
          throw new UnauthorizedError("You must pass an authorization header");
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await handler(req as any, res as any, next);

      res.status(200).send(response);
    } catch (e) {
      if (e instanceof ServerError) {
        logError(e);

        if (process.env.NODE_ENV !== "production") {
          res.status(e.status).send(e);
        } else {
          res.status(e.status).send(e.name);
        }
      } else {
        logError(e);

        res.status(500).send(e);
      }
    }
  };
};
