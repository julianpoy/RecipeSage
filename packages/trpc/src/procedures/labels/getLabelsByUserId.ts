import { publicProcedure } from "../../trpc";
import { getVisibleLabels } from "@recipesage/util/server/db";
import { validateSession } from "@recipesage/util/server/general";
import { z } from "zod";

export const getLabelsByUserId = publicProcedure
  .input(
    z.object({
      userIds: z.array(z.string()),
    }),
  )
  .query(async ({ ctx, input }) => {
    const session = ctx.session;
    validateSession(session);

    const visibleLabels = await getVisibleLabels(session.userId, {
      userIds: input.userIds,
    });

    return visibleLabels;
  });
