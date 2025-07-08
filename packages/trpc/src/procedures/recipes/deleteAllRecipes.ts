import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { deleteHangingImagesForUser } from "@recipesage/util/server/storage";
import { deleteRecipes as deleteRecipesFromSearch } from "@recipesage/util/server/search";
import * as Sentry from "@sentry/node";

export const deleteAllRecipes = publicProcedure.mutation(async ({ ctx }) => {
  const session = ctx.session;
  validateTrpcSession(session);

  await prisma.$transaction(async (tx) => {
    const allRecipeIds = await tx.recipe.findMany({
      where: {
        userId: session.userId,
      },
      select: {
        id: true,
      },
    });

    await tx.recipe.deleteMany({
      where: {
        userId: session.userId,
      },
    });

    await deleteHangingImagesForUser(session.userId, tx);
    await deleteRecipesFromSearch(allRecipeIds.map((el) => el.id)).catch(
      (e) => {
        Sentry.captureException(e);
      },
    );
  });

  return "Ok";
});
