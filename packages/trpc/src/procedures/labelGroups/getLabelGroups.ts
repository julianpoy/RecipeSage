import {
  labelGroupSummary,
  labelGroupSummarySchema,
  prisma,
} from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { z } from "zod";

export const getLabelGroups = publicProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/labelGroups/getLabelGroups",
      tags: ["labelGroups"],
      summary: "Get all of the caller's label groups",
      protect: true,
    },
  })
  .output(z.array(labelGroupSummarySchema))
  .query(async ({ ctx }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const labelGroups = await prisma.labelGroup.findMany({
      where: {
        userId: session.userId,
      },
      ...labelGroupSummary,
      orderBy: {
        title: "asc",
      },
    });

    return labelGroups;
  });
