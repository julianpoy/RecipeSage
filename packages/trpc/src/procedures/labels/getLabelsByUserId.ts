import { publicProcedure } from "../../trpc";
import { getVisibleLabels } from "@recipesage/util/server/db";
import { z } from "zod";
import { labelSummarySchema } from "@recipesage/prisma";

export const getLabelsByUserId = publicProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/labels/getLabelsByUserId",
      tags: ["labels"],
      summary: "Get labels visible to the caller for the given user ids",
    },
  })
  .input(
    z.object({
      userIds: z.array(z.uuid()),
    }),
  )
  .output(z.array(labelSummarySchema))
  .query(async ({ ctx, input }) => {
    const session = ctx.session;

    const visibleLabels = await getVisibleLabels(session?.userId, {
      userIds: input.userIds,
    });

    return visibleLabels;
  });
