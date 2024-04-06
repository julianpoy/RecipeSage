import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { userPublic } from "@recipesage/prisma";
import { validateTrpcSession } from "@recipesage/util/server/general";

export const getMe = publicProcedure.query(async ({ ctx }) => {
  const session = ctx.session;
  validateTrpcSession(session);

  const profile = await prisma.user.findUnique({
    where: {
      id: session.userId,
    },
    ...userPublic,
  });

  return profile;
});
