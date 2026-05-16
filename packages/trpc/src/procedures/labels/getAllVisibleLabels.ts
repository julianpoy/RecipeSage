import { LabelSummary, labelSummarySchema } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { getVisibleLabels } from "@recipesage/util/server/db";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { z } from "zod";

export const getAllVisibleLabels = publicProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/labels/getAllVisibleLabels",
      tags: ["labels"],
      summary: "Get all labels visible to the caller (own and friends')",
      protect: true,
    },
  })
  .output(z.array(labelSummarySchema))
  .query(async ({ ctx }): Promise<LabelSummary[]> => {
    const session = ctx.session;
    validateTrpcSession(session);

    const visibleLabels = await getVisibleLabels(session.userId, {
      includeSelf: true,
      includeAllFriends: true,
    });

    return visibleLabels;
  });
