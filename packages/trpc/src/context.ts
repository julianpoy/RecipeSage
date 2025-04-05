import { prisma } from "@recipesage/prisma";
import { inferAsyncReturnType } from "@trpc/server";
import trpcExpress from "@trpc/server/adapters/express";

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

  return {
    session,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
