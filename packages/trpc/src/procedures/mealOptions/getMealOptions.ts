import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { mealOptionSummary } from "@recipesage/prisma";

export const getMealOptions = publicProcedure.query(async ({ ctx }) => {
  const session = ctx.session;
  validateTrpcSession(session);

  const mealOptions = await prisma.mealOption.findMany({
    where: {
      userId: session.userId,
    },
    ...mealOptionSummary,
    orderBy: {
      mealTime: "asc",
    },
  });

  return mealOptions;
});
