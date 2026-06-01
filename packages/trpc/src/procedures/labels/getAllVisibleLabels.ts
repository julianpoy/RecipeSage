import { LabelSummary, labelSummarySchema } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { getVisibleLabels } from "@recipesage/util/server/db";
import { z } from "zod";

export const getAllVisibleLabels = authenticatedProcedure
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
    const visibleLabels = await getVisibleLabels(ctx.session.userId, {
      includeSelf: true,
      includeAllFriends: true,
    });

    return visibleLabels;
  });
