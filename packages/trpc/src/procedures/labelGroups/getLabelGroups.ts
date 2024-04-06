import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { labelGroupSummary } from "@recipesage/prisma";

export const getLabelGroups = publicProcedure.query(async ({ ctx }) => {
  const session = ctx.session;
  validateTrpcSession(session);

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
