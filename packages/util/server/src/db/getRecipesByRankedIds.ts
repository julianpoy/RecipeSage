import {
  Prisma,
  prisma,
  RecipeSummaryLite,
  recipeSummaryLite,
} from "@recipesage/prisma";
import { convertPrismaRecipeSummaryLitesToRecipeSummaryLites } from "./convertPrismaRecipeSummaries";

export const getRecipesByRankedIds = async (args: {
  tx?: Prisma.TransactionClient;
  where: Prisma.RecipeWhereInput;
  rankedIds: string[];
  offset: number;
  limit: number;
}): Promise<RecipeSummaryLite[]> => {
  const { tx = prisma, where, rankedIds, offset, limit } = args;

  const matches = await tx.recipe.findMany({
    where,
    select: { id: true },
  });

  const rankById = new Map(rankedIds.map((id, idx) => [id, idx]));
  const orderedIds = matches
    .map((match) => match.id)
    .sort(
      (a, b) => (rankById.get(a) ?? Infinity) - (rankById.get(b) ?? Infinity),
    );

  const pageIds = orderedIds.slice(offset, offset + limit);
  const recipes = await tx.recipe.findMany({
    where: { id: { in: pageIds } },
    ...recipeSummaryLite,
  });

  const positionById = new Map(pageIds.map((id, idx) => [id, idx]));
  recipes.sort(
    (a, b) => (positionById.get(a.id) ?? 0) - (positionById.get(b.id) ?? 0),
  );

  return convertPrismaRecipeSummaryLitesToRecipeSummaryLites(recipes);
};
