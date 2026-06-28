import { publicProcedure } from "../../trpc";
import { z } from "zod";
import { Prisma, prisma } from "@recipesage/prisma";
import {
  discoverRecipeSummarySchema,
  discoverRecipeSummarySelect,
  prismaDiscoverRecipeToSummary,
} from "./discoverRecipeSchemas";

const buildTsQuery = (searchTerm: string): string | undefined => {
  const tokens = searchTerm
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((token) => token.length > 0);

  if (!tokens.length) return undefined;

  return tokens.map((token) => `${token}:*`).join(" & ");
};

export const searchDiscoverRecipes = publicProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/discover/searchDiscoverRecipes",
      tags: ["discover"],
      summary: "Browse and search the public discover recipe catalog",
    },
  })
  .input(
    z.object({
      searchTerm: z.string().max(255).optional(),
      languages: z.array(z.string().max(35)).optional(),
      categories: z.array(z.string()).optional(),
      matchAllCategories: z.boolean().optional(),
      minRating: z.number().min(0).max(5).optional(),
      minRatingCount: z.number().int().min(0).optional(),
      photo: z.enum(["optional", "required", "none"]).default("optional"),
      sortBy: z
        .enum(["trending", "newest", "topRated", "mostSaved"])
        .default("trending"),
      offset: z.number().int().min(0).default(0),
      limit: z.number().int().min(1).max(100).default(40),
    }),
  )
  .output(
    z.object({
      recipes: z.array(discoverRecipeSummarySchema),
    }),
  )
  .query(async ({ input }) => {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`"approvalState" = 'ACTIVE'`,
      Prisma.sql`NOT EXISTS (SELECT 1 FROM "Users" WHERE "Users".id = "Discover_Recipes"."authorId" AND "Users"."discoverStanding" = 'SHADOWBANNED')`,
    ];

    if (input.languages?.length) {
      conditions.push(Prisma.sql`"language" = ANY(${input.languages}::text[])`);
    }
    if (input.categories?.length) {
      conditions.push(
        input.matchAllCategories
          ? Prisma.sql`"categories" @> ${input.categories}::text[]`
          : Prisma.sql`"categories" && ${input.categories}::text[]`,
      );
    }
    if (input.minRating !== undefined) {
      conditions.push(Prisma.sql`"ratingAverage" >= ${input.minRating}`);
    }
    if (input.minRatingCount !== undefined) {
      conditions.push(Prisma.sql`"ratingCount" >= ${input.minRatingCount}`);
    }
    if (input.photo === "required") {
      conditions.push(
        Prisma.sql`EXISTS (SELECT 1 FROM "Discover_Recipe_Images" WHERE "Discover_Recipe_Images"."discoverRecipeId" = "Discover_Recipes".id)`,
      );
    }
    if (input.photo === "none") {
      conditions.push(
        Prisma.sql`NOT EXISTS (SELECT 1 FROM "Discover_Recipe_Images" WHERE "Discover_Recipe_Images"."discoverRecipeId" = "Discover_Recipes".id)`,
      );
    }

    const tsquery = input.searchTerm
      ? buildTsQuery(input.searchTerm)
      : undefined;

    if (tsquery) {
      conditions.push(Prisma.sql`tsv @@ to_tsquery('simple', ${tsquery})`);
    }

    let orderBy: Prisma.Sql;
    switch (input.sortBy) {
      case "newest":
        orderBy = Prisma.sql`"createdAt" DESC`;
        break;
      case "topRated":
        orderBy = Prisma.sql`"ratingAverage" DESC, "ratingCount" DESC`;
        break;
      case "mostSaved":
        orderBy = Prisma.sql`"saveCount" DESC, "createdAt" DESC`;
        break;
      default:
        orderBy = tsquery
          ? Prisma.sql`ts_rank(tsv, to_tsquery('simple', ${tsquery})) DESC`
          : Prisma.sql`"rankScore" DESC, "createdAt" DESC`;
        break;
    }

    const idRows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT id
      FROM "Discover_Recipes"
      WHERE ${Prisma.join(conditions, " AND ")}
      ORDER BY ${orderBy}
      LIMIT ${input.limit} OFFSET ${input.offset}
    `);

    if (!idRows.length) {
      return { recipes: [] };
    }

    const ids = idRows.map((row) => row.id);
    const orderById = new Map(ids.map((id, index) => [id, index]));

    const discoverRecipes = await prisma.discoverRecipe.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: discoverRecipeSummarySelect,
    });

    discoverRecipes.sort(
      (a, b) => (orderById.get(a.id) ?? 0) - (orderById.get(b.id) ?? 0),
    );

    return {
      recipes: discoverRecipes.map(prismaDiscoverRecipeToSummary),
    };
  });
