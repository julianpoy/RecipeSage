import { Prisma, prisma } from "@recipesage/prisma";

export const getDiscoverDistinctSaverCounts = async (
  discoverRecipeIds: string[],
): Promise<Map<string, number>> => {
  if (!discoverRecipeIds.length) return new Map();

  const rows = await prisma.$queryRaw<
    { discoverRecipeId: string; count: number }[]
  >(Prisma.sql`
    SELECT "discoverRecipeId", COUNT(DISTINCT "userId")::int AS count
    FROM "Discover_Recipe_Saves"
    WHERE "discoverRecipeId" = ANY(${discoverRecipeIds}::uuid[])
    GROUP BY "discoverRecipeId"
  `);

  return new Map(rows.map((row) => [row.discoverRecipeId, row.count]));
};
