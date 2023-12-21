import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { validateSession } from "../../utils/validateSession";
import { userPublic } from "../../types/userPublic";

export const getMe = publicProcedure.query(async ({ ctx }) => {
  const session = ctx.session;
  validateSession(session);

  const profile = await prisma.user.findUnique({
    where: {
      id: session.userId,
    },
    ...userPublic,
  });

  return profile;
});
