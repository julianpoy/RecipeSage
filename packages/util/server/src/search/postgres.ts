import { prisma } from "@recipesage/prisma";
import { SearchProvider } from "./";

const RESULT_LIMIT = 500;

export const indexRecipes = async () => {
  return Promise.resolve();
};

export const deleteRecipes = async () => {
  return Promise.resolve();
};

export const searchRecipes = async (userIds: string[], queryString: string) => {
  if (!userIds.length || !queryString.trim()) return [];

  const tokens = queryString
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((t) => t.length > 0);

  if (!tokens.length) return [];

  const tsquery = tokens.map((t) => `${t}:*`).join(" & ");
  const fuzzyTerm = tokens.join(" ");

  const [ftsResults, fuzzyResults] = await Promise.all([
    prisma.$queryRaw<{ id: string }[]>`
      SELECT id
      FROM "Recipes"
      WHERE "userId" = ANY(${userIds}::uuid[])
        AND tsv @@ to_tsquery('simple', ${tsquery})
      ORDER BY ts_rank(tsv, to_tsquery('simple', ${tsquery})) DESC
      LIMIT ${RESULT_LIMIT}
    `,
    prisma.$queryRaw<{ id: string }[]>`
      SELECT id
      FROM "Recipes"
      WHERE "userId" = ANY(${userIds}::uuid[])
        AND immutable_unaccent(lower(title)) %> immutable_unaccent(lower(${fuzzyTerm}))
      ORDER BY immutable_unaccent(lower(title)) <-> immutable_unaccent(lower(${fuzzyTerm}))
      LIMIT ${RESULT_LIMIT}
    `,
  ]);

  const seen = new Set<string>();
  const merged: string[] = [];
  for (const r of ftsResults) {
    if (!seen.has(r.id)) {
      seen.add(r.id);
      merged.push(r.id);
    }
  }
  for (const r of fuzzyResults) {
    if (merged.length >= RESULT_LIMIT) break;
    if (!seen.has(r.id)) {
      seen.add(r.id);
      merged.push(r.id);
    }
  }
  return merged;
};

export default {
  indexRecipes,
  deleteRecipes,
  searchRecipes,
} satisfies SearchProvider;
