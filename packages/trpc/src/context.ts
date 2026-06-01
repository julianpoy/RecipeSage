import { prisma } from "@recipesage/prisma";
import * as Sentry from "@sentry/node";
import { inferAsyncReturnType } from "@trpc/server";
import * as trpcExpress from "@trpc/server/adapters/express";
import {
  extendSession,
  getRequestLanguage,
} from "@recipesage/util/server/general";

export async function createContext({
  req,
}: trpcExpress.CreateExpressContextOptions) {
  async function getSessionFromHeader() {
    if (req.headers.authorization) {
      const token = req.headers.authorization.split(" ")[1];
      if (!token) return null;

      const session = prisma.session.findFirst({
        where: {
          token,
        },
      });

      return session;
    }
    return null;
  }

  const session = await getSessionFromHeader();

  if (session) {
    Sentry.setUser({
      id: session.userId,
    });
    extendSession(session);
  }

  return {
    session,
    language: getRequestLanguage(req),
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
