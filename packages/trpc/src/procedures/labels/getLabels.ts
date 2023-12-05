import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { validateSession } from "../../utils/validateSession";
import { labelSummary } from "../../types/labelSummary";

export const getLabels = publicProcedure.query(async ({ ctx }) => {
  const session = ctx.session;
  validateSession(session);

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
