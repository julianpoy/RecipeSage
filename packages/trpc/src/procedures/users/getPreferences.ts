import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { validateSession } from "../../utils/validateSession";
import { AppPreferenceTypes } from "@recipesage/util";

export const getPreferences = publicProcedure.query(async ({ ctx }) => {
  const session = ctx.session;
  validateSession(session);

  const user = await prisma.user.findUniqueOrThrow({
    where: {
      id: session.userId,
    },
  });

  // Cast to unknown since there is no good way of typing prisma json fields
  // Field is optional, so nullable
  const preferences = user.preferences as unknown as AppPreferenceTypes | null;

  return preferences;
});
