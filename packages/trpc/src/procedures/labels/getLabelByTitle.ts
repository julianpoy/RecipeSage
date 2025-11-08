import { labelSummary, prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const getLabelByTitle = publicProcedure
  .input(
    z.object({
      title: z.string(),
    }),
  )
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
