import { publicProcedure } from "../../trpc";
import { getVisibleLabels } from "@recipesage/util/server/db";
import { validateSession } from "@recipesage/util/server/general";

export const getAllVisibleLabels = publicProcedure.query(async ({ ctx }) => {
  const session = ctx.session;
  validateSession(session);

  const visibleLabels = await getVisibleLabels(session.userId, {
    includeSelf: true,
    includeAllFriends: true,
  });

  return visibleLabels;
});
