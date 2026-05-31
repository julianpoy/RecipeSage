import {
  labelGroupSummary,
  labelGroupSummarySchema,
  prisma,
} from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";

export const getLabelGroups = authenticatedProcedure
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
    const labelGroups = await prisma.labelGroup.findMany({
      where: {
        userId: ctx.session.userId,
      },
      ...labelGroupSummary,
      orderBy: {
        title: "asc",
      },
    });

    return labelGroups;
  });
