import { labelSummary, labelSummarySchema, prisma } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";

export const getLabels = authenticatedProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/labels/getLabels",
      tags: ["labels"],
      summary: "Get all of the caller's labels",
      protect: true,
    },
  })
  .output(z.array(labelSummarySchema))
  .query(async ({ ctx }) => {
    const labels = await prisma.label.findMany({
      where: {
        userId: ctx.session.userId,
      },
      ...labelSummary,
      orderBy: {
        title: "asc",
      },
    });

    return labels;
  });
