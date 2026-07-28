import { prismaReplica } from "@recipesage/prisma";
import { getRecipeConstraintsSql } from "../db/getRecipeConstraintsSql";
import { type RecipeConstraints } from "../db/recipeConstraints";

export const searchRecipeIds = async (args: {
  constraints: RecipeConstraints;
  queryString: string;
  limit?: number;
}) => {
  const { constraints, queryString, limit = 100 } = args;

  if (!queryString.trim()) return [];

  const tokens = queryString
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((t) => t.length > 0);

  if (!tokens.length) return [];

  const tsquery = tokens.map((t) => `${t}:*`).join(" & ");
  const fuzzyTerm = tokens.join(" ");
  const constraintsSql = await getRecipeConstraintsSql(
    constraints,
    prismaReplica,
  );

  if (!constraintsSql) return [];

  const [ftsResults, fuzzyResults] = await Promise.all([
    prismaReplica.$queryRaw<{ id: string }[]>`
      SELECT "Recipes".id
      FROM "Recipes"
      WHERE ${constraintsSql}
        AND "Recipes".tsv @@ to_tsquery('simple', immutable_unaccent(${tsquery}))
      ORDER BY ts_rank("Recipes".tsv, to_tsquery('simple', immutable_unaccent(${tsquery}))) DESC
      LIMIT ${limit}
    `,
    prismaReplica.$queryRaw<{ id: string }[]>`
      SELECT "Recipes".id
      FROM "Recipes"
      WHERE ${constraintsSql}
        AND immutable_unaccent(lower("Recipes".title)) %> immutable_unaccent(lower(${fuzzyTerm}))
      ORDER BY immutable_unaccent(lower("Recipes".title)) <-> immutable_unaccent(lower(${fuzzyTerm}))
      LIMIT ${limit}
    `,
  ]);

  const seen = new Set<string>();
  const merged: string[] = [];
  for (const row of ftsResults) {
    if (!seen.has(row.id)) {
      seen.add(row.id);
      merged.push(row.id);
    }
  }
  for (const row of fuzzyResults) {
    if (merged.length >= limit) break;
    if (!seen.has(row.id)) {
      seen.add(row.id);
      merged.push(row.id);
    }
  }
  return merged;
};
