import { Prisma, prisma } from "@recipesage/prisma";
import { type NutritionRange } from "@recipesage/prisma";
import { type RecipeConstraints } from "./recipeConstraints";
import {
  isRecipeVisibilityEmpty,
  resolveRecipeVisibility,
} from "./resolveRecipeVisibility";
import { recipeVisibilityToSql } from "./recipeVisibilityToSql";

export const getRecipeConstraintsSql = async (
  constraints: RecipeConstraints,
  tx: Prisma.TransactionClient = prisma,
): Promise<Prisma.Sql | null> => {
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

  const conditions: Prisma.Sql[] = [recipeVisibilityToSql(visibility)];

  if (folder) {
    conditions.push(Prisma.sql`"Recipes".folder = ${folder}`);
  }

  if (recipeIds) {
    conditions.push(Prisma.sql`"Recipes".id = ANY(${recipeIds}::uuid[])`);
  }

  if (ratings?.length) {
    const ors: Prisma.Sql[] = [];
    const numericRatings = ratings.filter(
      (rating): rating is number => rating !== null && Number.isInteger(rating),
    );
    if (numericRatings.length) {
      ors.push(Prisma.sql`"Recipes".rating = ANY(${numericRatings}::int[])`);
    }
    if (ratings.includes(null)) {
      ors.push(Prisma.sql`"Recipes".rating IS NULL`);
    }
    conditions.push(
      ors.length
        ? Prisma.sql`(${Prisma.join(ors, " OR ")})`
        : Prisma.sql`false`,
    );
  }

  const addNutritionFilter = (
    range: NutritionRange | undefined,
    column: Prisma.Sql,
  ) => {
    if (!range) return;
    const hasRange = range.min != null || range.max != null;
    if (!hasRange && !range.matchMissing) return;
    const ors: Prisma.Sql[] = [];
    if (hasRange) {
      const bounds: Prisma.Sql[] = [];
      if (range.min != null) bounds.push(Prisma.sql`${column} >= ${range.min}`);
      if (range.max != null) bounds.push(Prisma.sql`${column} <= ${range.max}`);
      ors.push(Prisma.sql`(${Prisma.join(bounds, " AND ")})`);
    }
    if (range.matchMissing) {
      ors.push(Prisma.sql`${column} IS NULL`);
    }
    conditions.push(Prisma.sql`(${Prisma.join(ors, " OR ")})`);
  };

  addNutritionFilter(
    nutritionFilter?.calories,
    Prisma.sql`"Recipes"."nutritionCalories"`,
  );
  addNutritionFilter(
    nutritionFilter?.protein,
    Prisma.sql`"Recipes"."nutritionProtein"`,
  );
  addNutritionFilter(
    nutritionFilter?.totalCarbs,
    Prisma.sql`"Recipes"."nutritionTotalCarbs"`,
  );
  addNutritionFilter(
    nutritionFilter?.totalFat,
    Prisma.sql`"Recipes"."nutritionTotalFat"`,
  );
  addNutritionFilter(
    nutritionFilter?.sodium,
    Prisma.sql`"Recipes"."nutritionSodium"`,
  );

  if (mustBeUnlabeled) {
    conditions.push(Prisma.sql`NOT EXISTS (
      SELECT 1
      FROM "Recipe_Labels" rl
      JOIN "Labels" l ON l.id = rl."labelId"
      WHERE rl."recipeId" = "Recipes".id
        AND l."userId" = ANY(${userIds}::uuid[])
    )`);
  }

  if (labels?.length && labelIntersection) {
    for (const label of labels) {
      conditions.push(Prisma.sql`EXISTS (
        SELECT 1
        FROM "Recipe_Labels" rl
        JOIN "Labels" l ON l.id = rl."labelId"
        WHERE rl."recipeId" = "Recipes".id
          AND l."userId" = ANY(${userIds}::uuid[])
          AND l.title = ${label}
      )`);
    }
  }

  if (labels?.length && !labelIntersection) {
    conditions.push(Prisma.sql`EXISTS (
      SELECT 1
      FROM "Recipe_Labels" rl
      JOIN "Labels" l ON l.id = rl."labelId"
      WHERE rl."recipeId" = "Recipes".id
        AND l."userId" = ANY(${userIds}::uuid[])
        AND l.title = ANY(${labels}::text[])
    )`);
  }

  return Prisma.sql`(${Prisma.join(conditions, " AND ")})`;
};
