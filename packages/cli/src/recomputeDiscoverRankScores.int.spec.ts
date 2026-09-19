import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma, User } from "@recipesage/prisma";
import {
  userFactory,
  discoverRecipeFactory,
} from "@recipesage/util/server/general";

import { recomputeDiscoverRankScores } from "./recomputeDiscoverRankScores";

describe("recomputeDiscoverRankScores", () => {
  let author: User;
  let otherAuthor: User;
  const cleanupIds: string[] = [];

  beforeEach(async () => {
    author = await prisma.user.create({ data: userFactory() });
    otherAuthor = await prisma.user.create({ data: userFactory() });
    cleanupIds.push(author.id, otherAuthor.id);
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: cleanupIds } } });
    cleanupIds.length = 0;
  });

  it("scores each recipe from an author the same when they are alike", async () => {
    const createdAt = new Date();
    const first = await prisma.discoverRecipe.create({
      data: { ...discoverRecipeFactory(author.id), createdAt, qualityScore: 5 },
    });
    const second = await prisma.discoverRecipe.create({
      data: { ...discoverRecipeFactory(author.id), createdAt, qualityScore: 5 },
    });
    const singleRecipeAuthor = await prisma.discoverRecipe.create({
      data: {
        ...discoverRecipeFactory(otherAuthor.id),
        createdAt,
        qualityScore: 5,
      },
    });

    await recomputeDiscoverRankScores({ batchSize: 100 });

    const scores = await prisma.discoverRecipe.findMany({
      where: { id: { in: [first.id, second.id, singleRecipeAuthor.id] } },
      select: { id: true, rankScore: true },
    });

    expect(scores).toHaveLength(3);
    for (const discoverRecipe of scores) {
      expect(discoverRecipe.rankScore).toBeCloseTo(scores[0].rankScore);
    }
  });

  it("stores a confidence weighted rating score, and the prior when nobody rated", async () => {
    const rated = await prisma.discoverRecipe.create({
      data: {
        ...discoverRecipeFactory(author.id),
        ratingAverage: 5,
        ratingCount: 1,
      },
    });
    const unrated = await prisma.discoverRecipe.create({
      data: discoverRecipeFactory(otherAuthor.id),
    });

    await recomputeDiscoverRankScores({ batchSize: 100 });

    const updatedRated = await prisma.discoverRecipe.findUniqueOrThrow({
      where: { id: rated.id },
    });
    const updatedUnrated = await prisma.discoverRecipe.findUniqueOrThrow({
      where: { id: unrated.id },
    });

    expect(updatedRated.ratingScore).toBeCloseTo(3.75);
    expect(updatedUnrated.ratingScore).toBeCloseTo(3.5);
  });
});
