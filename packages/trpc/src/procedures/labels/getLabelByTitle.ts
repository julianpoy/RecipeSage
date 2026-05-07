import { labelSummary, labelSummarySchema, prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const getLabelByTitle = publicProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/labels/getLabelByTitle",
      tags: ["labels"],
      summary: "Get a label by title",
      protect: true,
    },
  })
  .input(
    z.object({
      title: z.string(),
    }),
  )
  .output(labelSummarySchema)
  .query(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const label = await prisma.label.findUnique({
      where: {
        userId_title: {
          userId: session.userId,
          title: input.title,
        },
      },
      ...labelSummary,
    });

    if (!label) {
      throw new TRPCError({
        message: "A label with that title was not found",
        code: "NOT_FOUND",
      });
    }

    return label;
  });
