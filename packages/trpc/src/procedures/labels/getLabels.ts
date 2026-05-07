import { labelSummary, labelSummarySchema, prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { z } from "zod";

export const getLabels = publicProcedure
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
    const session = ctx.session;
    validateTrpcSession(session);

    const labels = await prisma.label.findMany({
      where: {
        userId: session.userId,
      },
      ...labelSummary,
      orderBy: {
        title: "asc",
      },
    });

    return labels;
  });
