import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { validateSession } from "../../utils/validateSession";
import { labelGroupSummary } from "../../types/labelGroupSummary";

export const getLabelGroups = publicProcedure.query(async ({ ctx }) => {
  const session = ctx.session;
  validateSession(session);

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
