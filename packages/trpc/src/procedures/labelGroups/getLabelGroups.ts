import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { validateSession } from "@recipesage/util/server";
import { labelGroupSummary } from "@recipesage/prisma";

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
