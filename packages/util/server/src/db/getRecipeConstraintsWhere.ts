import { Prisma, prisma } from "@recipesage/prisma";
import { type NutritionRange } from "@recipesage/prisma";
import { type RecipeConstraints } from "./recipeConstraints";
import {
  isRecipeVisibilityEmpty,
  resolveRecipeVisibility,
} from "./resolveRecipeVisibility";
import { recipeVisibilityToPrismaWhere } from "./recipeVisibilityToPrismaWhere";

export const getRecipeConstraintsWhere = async (
  constraints: RecipeConstraints,
  tx: Prisma.TransactionClient = prisma,
): Promise<Prisma.RecipeWhereInput | null> => {
  const {
    userIds,
    folder,
    recipeIds,
    labels: _labels,
    labelIntersection,
    ratings,
    nutritionFilter,
  } = constraints;

  const labels = _labels?.filter((label) => label !== "unlabeled");
  const mustBeUnlabeled = !!_labels?.includes("unlabeled");

  const visibility = await resolveRecipeVisibility({
    tx,
    userId: constraints.sessionUserId,
    userIds,
    friendIds: constraints.friendIds,
  });

  if (isRecipeVisibilityEmpty(visibility)) return null;

  const queryFilters = recipeVisibilityToPrismaWhere(visibility);

  if (!queryFilters.length) return null;

  const where = {
    AND: [] as Prisma.RecipeWhereInput[],
  } satisfies Prisma.RecipeWhereInput;

  where.AND.push({
    OR: queryFilters,
  });
  if (folder) {
    where.AND.push({
      folder,
    });
  }

  if (recipeIds) {
    where.AND.push({ id: { in: recipeIds } });
  }

  if (ratings?.length) {
    const usableRatings = ratings.filter(
      (rating) => rating === null || Number.isInteger(rating),
    );
    where.AND.push(
      usableRatings.length
        ? { OR: usableRatings.map((rating) => ({ rating })) }
        : { rating: { in: [] } },
    );
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
                  userId: {
                    in: userIds,
                  },
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
            userId: {
              in: userIds,
            },
            title: {
              in: labels,
            },
          },
        },
      },
    });
  }

  return where;
};
