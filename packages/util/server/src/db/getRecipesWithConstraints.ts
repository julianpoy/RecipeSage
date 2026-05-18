import { Prisma } from "@recipesage/prisma";
import {
  prisma,
  RecipeSummaryLite,
  recipeSummaryLite,
  type NutritionFilter,
  type NutritionRange,
} from "@recipesage/prisma";
import { getRecipeVisibilityQueryFilter } from "./getRecipeVisibilityQueryFilter";
import { convertPrismaRecipeSummaryLitesToRecipeSummaryLites } from "./convertPrismaRecipeSummaries";

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
  nutritionFilter?: NutritionFilter;
  friendIds?: Set<string>;
}): Promise<{ recipes: RecipeSummaryLite[]; totalCount: number }> => {
  const {
    tx = prisma,
    userId: contextUserId,
    userIds,
    folder,
    orderBy,
    offset,
    limit,
    recipeIds,
    labels: _labels,
    labelIntersection,
    ratings,
    nutritionFilter,
  } = args;

  const labels = _labels?.filter((label) => label !== "unlabeled");
  const mustBeUnlabeled = !!_labels?.includes("unlabeled");

  const queryFilters = await getRecipeVisibilityQueryFilter({
    tx: args.tx,
    userId: contextUserId,
    userIds,
    friendIds: args.friendIds,
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

  const addNutritionFilter = (
    range: NutritionRange | undefined,
    rangeClause: (gtelte: {
      gte?: number;
      lte?: number;
    }) => Prisma.RecipeWhereInput,
    missingClause: () => Prisma.RecipeWhereInput,
  ) => {
    if (!range) return;
    const hasRange = range.min != null || range.max != null;
    if (!hasRange && !range.matchMissing) return;
    const ors: Prisma.RecipeWhereInput[] = [];
    if (hasRange) {
      const gtelte: { gte?: number; lte?: number } = {};
      if (range.min != null) gtelte.gte = range.min;
      if (range.max != null) gtelte.lte = range.max;
      ors.push(rangeClause(gtelte));
    }
    if (range.matchMissing) {
      ors.push(missingClause());
    }
    where.AND.push({ OR: ors });
  };

  addNutritionFilter(
    nutritionFilter?.calories,
    (gtelte) => ({ nutritionCalories: gtelte }),
    () => ({ nutritionCalories: null }),
  );
  addNutritionFilter(
    nutritionFilter?.protein,
    (gtelte) => ({ nutritionProtein: gtelte }),
    () => ({ nutritionProtein: null }),
  );
  addNutritionFilter(
    nutritionFilter?.totalCarbs,
    (gtelte) => ({ nutritionTotalCarbs: gtelte }),
    () => ({ nutritionTotalCarbs: null }),
  );
  addNutritionFilter(
    nutritionFilter?.totalFat,
    (gtelte) => ({ nutritionTotalFat: gtelte }),
    () => ({ nutritionTotalFat: null }),
  );
  addNutritionFilter(
    nutritionFilter?.sodium,
    (gtelte) => ({ nutritionSodium: gtelte }),
    () => ({ nutritionSodium: null }),
  );

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
    recipes: convertPrismaRecipeSummaryLitesToRecipeSummaryLites(recipes),
    totalCount,
  };
};
