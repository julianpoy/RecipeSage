import { LabelSummary } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { getVisibleLabels } from "@recipesage/util/server/db";
import { validateTrpcSession } from "@recipesage/util/server/general";

export const getAllVisibleLabels = publicProcedure.query(
  async ({ ctx }): Promise<LabelSummary[]> => {
    const session = ctx.session;
    validateTrpcSession(session);

    const visibleLabels = await getVisibleLabels(session.userId, {
      includeSelf: true,
      includeAllFriends: true,
    });

    return visibleLabels;
  },
);
