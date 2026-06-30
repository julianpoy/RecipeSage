import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma, User } from "@recipesage/prisma";
import { getDiscoverDistinctSaverCounts } from "./getDiscoverDistinctSaverCounts";
import { userFactory, discoverRecipeFactory } from "../general/factories";

describe("getDiscoverDistinctSaverCounts (integration)", () => {
  let author: User;
  let saverA: User;
  let saverB: User;
  const cleanupIds: string[] = [];

  beforeEach(async () => {
    author = await prisma.user.create({ data: userFactory() });
    saverA = await prisma.user.create({ data: userFactory() });
    saverB = await prisma.user.create({ data: userFactory() });
    cleanupIds.push(author.id, saverA.id, saverB.id);
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: cleanupIds } } });
    cleanupIds.length = 0;
  });

  it("counts each distinct saver once regardless of repeat saves", async () => {
    const recipe = await prisma.discoverRecipe.create({
      data: discoverRecipeFactory(author.id),
    });

    await prisma.discoverRecipeSave.createMany({
      data: [
        { discoverRecipeId: recipe.id, userId: saverA.id },
        { discoverRecipeId: recipe.id, userId: saverA.id },
        { discoverRecipeId: recipe.id, userId: saverB.id },
      ],
    });

    const counts = await getDiscoverDistinctSaverCounts([recipe.id]);
    expect(counts.get(recipe.id)).toEqual(2);
  });

  it("omits recipes with no saves", async () => {
    const recipe = await prisma.discoverRecipe.create({
      data: discoverRecipeFactory(author.id),
    });

    const counts = await getDiscoverDistinctSaverCounts([recipe.id]);
    expect(counts.has(recipe.id)).toEqual(false);
  });

  it("returns an empty map for no ids", async () => {
    const counts = await getDiscoverDistinctSaverCounts([]);
    expect(counts.size).toEqual(0);
  });
});
