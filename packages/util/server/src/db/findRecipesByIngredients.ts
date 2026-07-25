import { prisma, Prisma } from "@recipesage/prisma";
import { SEARCH_RECIPES_BY_INGREDIENTS_MAX_TERMS } from "@recipesage/util/shared";

const DEFAULT_LIMIT = 100;

const normalizeIngredientTerms = (ingredients: string[]): string[] => {
  const seen = new Set<string>();
  const terms: string[] = [];

  for (const ingredient of ingredients) {
    const trimmed = ingredient.trim();
    if (!trimmed) continue;

    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    terms.push(trimmed);

    if (terms.length >= SEARCH_RECIPES_BY_INGREDIENTS_MAX_TERMS) break;
  }

  return terms;
};

export const findRecipesByIngredients = async (args: {
  userIds: string[];
  ingredients: string[];
  folder: string;
  limit?: number;
  tx?: Prisma.TransactionClient;
}): Promise<{ recipeId: string; matchedTerms: string[] }[]> => {
  const { userIds, folder, tx = prisma } = args;
  const limit = args.limit ?? DEFAULT_LIMIT;
  const terms = normalizeIngredientTerms(args.ingredients);

  if (!userIds.length || !terms.length) return [];

  const rows = await tx.$queryRaw<{ id: string; matched: string[] }[]>`
    SELECT
      r.id,
      m.matched
    FROM "Recipes" r
    CROSS JOIN LATERAL (
      SELECT to_tsvector('simple', immutable_unaccent(left(coalesce(r.ingredients, ''), 3000))) AS iv
    ) v
    CROSS JOIN LATERAL (
      SELECT
        count(*)::int AS matched_count,
        array_agg(t.term ORDER BY t.term) AS matched
      FROM unnest(${terms}::text[]) AS t(term)
      WHERE v.iv @@ phraseto_tsquery('simple', immutable_unaccent(t.term))
    ) m
    CROSS JOIN LATERAL (
      SELECT count(*)::int AS ingredient_count
      FROM unnest(string_to_array(coalesce(r.ingredients, ''), E'\n')) AS line
      WHERE btrim(line, E' \t\r') <> ''
        AND btrim(line, E' \t\r') NOT LIKE '[%]'
    ) c
    WHERE r."userId" = ANY(${userIds}::uuid[])
      AND r.folder = ${folder}
      AND r.tsv @@ (
        SELECT string_agg(q::text, ' | ')::tsquery
        FROM (
          SELECT phraseto_tsquery('simple', immutable_unaccent(term)) AS q
          FROM unnest(${terms}::text[]) AS u(term)
        ) sub
        WHERE numnode(q) > 0
      )
      AND m.matched_count > 0
    ORDER BY
      m.matched_count DESC,
      greatest(c.ingredient_count - m.matched_count, 0) ASC,
      r.title ASC,
      r.id ASC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    recipeId: row.id,
    matchedTerms: row.matched,
  }));
};
