import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { labelSummary } from "@recipesage/prisma";

export const getLabels = publicProcedure.query(async ({ ctx }) => {
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
