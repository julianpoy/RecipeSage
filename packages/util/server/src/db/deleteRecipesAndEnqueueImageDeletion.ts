import { Prisma, PrismaTransactionClient } from "@recipesage/prisma";
import { enqueueImageDeletion } from "../general/queue/imageDeletion/enqueueImageDeletion";

export const deleteRecipesAndEnqueueImageDeletion = async (
  userId: string,
  where: Prisma.RecipeWhereInput,
  tx: PrismaTransactionClient,
) => {
  const userRecipesWhere = {
    ...where,
    userId,
  };

  const recipeImages = await tx.recipeImage.findMany({
    where: {
      recipe: userRecipesWhere,
    },
    select: {
      imageId: true,
    },
  });

  await tx.recipe.deleteMany({
    where: userRecipesWhere,
  });

  await enqueueImageDeletion(
    recipeImages.map((recipeImage) => recipeImage.imageId),
    userId,
  );
};
