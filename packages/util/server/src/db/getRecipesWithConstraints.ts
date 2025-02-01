import { Prisma } from "@prisma/client";
import {
  prisma,
  RecipeSummaryLite,
  recipeSummaryLite,
} from "@recipesage/prisma";
import { getRecipeVisibilityQueryFilter } from "./getRecipeVisibilityQueryFilter";

export const getRecipesWithConstraints = async (args: {
  tx?: Prisma.TransactionClient;
  userId?: string;
  userIds: string[];
  folder: string;
  orderBy: Prisma.RecipeOrderByWithRelationInput;
  offset: number;
  limit: number;
  recipeIds?: string[];
  labels?: string[];
  labelIntersection?: boolean;
  ratings?: (number | null)[];
}): Promise<{ recipes: RecipeSummaryLite[]; totalCount: number }> => {
  const {
    tx = prisma,
    userId: contextUserId,
    userIds,
    folder,
    orderBy,
    offset,
    limit,
    recipeIds: filterByRecipeIds,
    labels: _labels,
    labelIntersection,
    ratings,
    recipeIds,
  } = args;

  const labels = _labels?.filter((label) => label !== "unlabeled");
  const mustBeUnlabeled = !!_labels?.includes("unlabeled");

  const queryFilters = await getRecipeVisibilityQueryFilter({
    tx: args.tx,
    userId: contextUserId,
    userIds,
  });

  if (!queryFilters.length)
    return {
      recipes: [],
      totalCount: 0,
    };

  const where = {
    AND: [] as Prisma.RecipeWhereInput[],
  } satisfies Prisma.RecipeWhereInput;

  where.AND.push({
    OR: queryFilters,
  });
  where.AND.push({
    folder,
  });

  if (recipeIds) {
    where.AND.push({ id: { in: recipeIds } });
  }

  if (ratings) {
    where.AND.push({
      OR: ratings.map((rating) => ({
        rating,
      })),
    });
  }

  if (filterByRecipeIds) {
    where.AND.push({ id: { in: filterByRecipeIds } });
  }

  if (mustBeUnlabeled) {
    where.AND.push({
      recipeLabels: {
        none: {
          label: {
            userId: {
              in: userIds, // We do this rather than none:{} due to Prisma perf issues...
            },
          },
        },
      },
    });
  }

  if (labels?.length && labelIntersection) {
    where.AND.push(
      ...labels.map(
        (label) =>
          ({
            recipeLabels: {
              some: {
                label: {
                  title: label,
                },
              },
            },
          }) as Prisma.RecipeWhereInput,
      ),
    );
  }

  if (labels?.length && !labelIntersection) {
    where.AND.push({
      recipeLabels: {
        some: {
          label: {
            title: {
              in: labels,
            },
          },
        },
      },
    });
  }

  const [totalCount, recipes] = await Promise.all([
    tx.recipe.count({
      where,
    }),
    tx.recipe.findMany({
      where,
      ...recipeSummaryLite,
      orderBy,
      skip: offset,
      take: limit,
    }),
  ]);

  return {
    recipes,
    totalCount,
  };
};
