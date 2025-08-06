import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { mealOptionSummary } from "@recipesage/prisma";
import { z } from "zod";

export const get = publicProcedure
  .input(
    z.object({
      title: z.string().optional(),
    }).optional()
  )
  .query(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const whereClause: {
      userId: string;
      title?: {
        contains: string;
        mode: 'insensitive';
      };
    } = {
      userId: session.userId,
    };

    // Add title filter if provided
    if (input?.title) {
      whereClause.title = {
        contains: input.title,
        mode: 'insensitive',
      };
    }

    const mealOptions = await prisma.mealOption.findMany({
      where: whereClause,
      ...mealOptionSummary,
      orderBy: {
        mealTime: "asc",
      },
    });

    return mealOptions;
  });
