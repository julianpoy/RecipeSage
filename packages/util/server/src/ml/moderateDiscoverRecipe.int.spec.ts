import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  prisma,
  User,
  DiscoverApprovalState,
  DiscoverReportSource,
} from "@recipesage/prisma";
import {
  DISCOVER_CATEGORIES,
  MAX_DISCOVER_CATEGORIES_PER_RECIPE,
} from "@recipesage/util/shared";
import { userFactory, discoverRecipeFactory } from "../general/factories";

const { generateTextMock } = vi.hoisted(() => ({
  generateTextMock: vi.fn(),
}));

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    generateText: (...args: unknown[]) => generateTextMock(...args),
  };
});

import { moderateDiscoverRecipe } from "./moderateDiscoverRecipe";

function mockModerationOutput(output: {
  appropriate: boolean;
  reason: string;
  categories: string[];
  language: string;
}) {
  generateTextMock.mockResolvedValue({ output });
}

describe("moderateDiscoverRecipe (integration)", () => {
  let author: User;
  const cleanupIds: string[] = [];

  beforeEach(async () => {
    generateTextMock.mockReset();
    author = await prisma.user.create({ data: userFactory() });
    cleanupIds.push(author.id);
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: cleanupIds } } });
    cleanupIds.length = 0;
  });

  async function createPendingRecipe() {
    return prisma.discoverRecipe.create({
      data: {
        ...discoverRecipeFactory(author.id),
        approvalState: DiscoverApprovalState.PENDING,
      },
    });
  }

  it("activates a clean recipe and records no reports", async () => {
    const recipe = await createPendingRecipe();
    mockModerationOutput({
      appropriate: true,
      reason: "",
      categories: ["dinner"],
      language: "en",
    });

    await moderateDiscoverRecipe(recipe.id);

    const updated = await prisma.discoverRecipe.findUniqueOrThrow({
      where: { id: recipe.id },
    });
    expect(updated.approvalState).toEqual(DiscoverApprovalState.ACTIVE);
    expect(updated.categories).toContain("dinner");

    const reports = await prisma.discoverRecipeReport.findMany({
      where: { discoverRecipeId: recipe.id },
    });
    expect(reports).toHaveLength(0);
  });

  it("shadowbans an inappropriate recipe and records a SYSTEM report with the reason", async () => {
    const recipe = await createPendingRecipe();
    mockModerationOutput({
      appropriate: false,
      reason: "Contains explicit imagery",
      categories: [],
      language: "en",
    });

    await moderateDiscoverRecipe(recipe.id);

    const updated = await prisma.discoverRecipe.findUniqueOrThrow({
      where: { id: recipe.id },
    });
    expect(updated.approvalState).toEqual(DiscoverApprovalState.SHADOWBANNED);

    const reports = await prisma.discoverRecipeReport.findMany({
      where: { discoverRecipeId: recipe.id },
    });
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      source: DiscoverReportSource.SYSTEM,
      reporterId: null,
      reason: "Contains explicit imagery",
    });
  });

  it("clears prior SYSTEM reports but leaves USER reports untouched", async () => {
    const recipe = await createPendingRecipe();
    const reporter = await prisma.user.create({ data: userFactory() });
    cleanupIds.push(reporter.id);

    await prisma.discoverRecipeReport.create({
      data: {
        discoverRecipeId: recipe.id,
        source: DiscoverReportSource.SYSTEM,
        reason: "stale system flag",
      },
    });
    await prisma.discoverRecipeReport.create({
      data: {
        discoverRecipeId: recipe.id,
        source: DiscoverReportSource.USER,
        reporterId: reporter.id,
        reason: "user report",
      },
    });

    mockModerationOutput({
      appropriate: true,
      reason: "",
      categories: [],
      language: "en",
    });

    await moderateDiscoverRecipe(recipe.id);

    const systemReports = await prisma.discoverRecipeReport.findMany({
      where: {
        discoverRecipeId: recipe.id,
        source: DiscoverReportSource.SYSTEM,
      },
    });
    expect(systemReports).toHaveLength(0);

    const userReports = await prisma.discoverRecipeReport.findMany({
      where: {
        discoverRecipeId: recipe.id,
        source: DiscoverReportSource.USER,
      },
    });
    expect(userReports).toHaveLength(1);
    expect(userReports[0].reason).toEqual("user report");
  });

  it("persists only valid category keys from the model output", async () => {
    const recipe = await createPendingRecipe();
    const validKeys = DISCOVER_CATEGORIES.map((category) => category.key);
    mockModerationOutput({
      appropriate: true,
      reason: "",
      categories: [validKeys[0], "not-a-real-category", validKeys[1]],
      language: "en",
    });

    await moderateDiscoverRecipe(recipe.id);

    const updated = await prisma.discoverRecipe.findUniqueOrThrow({
      where: { id: recipe.id },
    });
    expect(updated.categories).toEqual([validKeys[0], validKeys[1]]);
  });

  it("falls back to existing categories when the model returns no valid keys", async () => {
    const validKey = DISCOVER_CATEGORIES[0].key;
    const recipe = await prisma.discoverRecipe.create({
      data: {
        ...discoverRecipeFactory(author.id),
        approvalState: DiscoverApprovalState.PENDING,
        categories: [validKey],
      },
    });
    mockModerationOutput({
      appropriate: true,
      reason: "",
      categories: ["bogus-one", "bogus-two"],
      language: "en",
    });

    await moderateDiscoverRecipe(recipe.id);

    const updated = await prisma.discoverRecipe.findUniqueOrThrow({
      where: { id: recipe.id },
    });
    expect(updated.categories).toEqual([validKey]);
  });

  it("clamps categories to the per-recipe maximum", async () => {
    const recipe = await createPendingRecipe();
    const tooManyValidKeys = DISCOVER_CATEGORIES.map(
      (category) => category.key,
    ).slice(0, MAX_DISCOVER_CATEGORIES_PER_RECIPE + 3);
    mockModerationOutput({
      appropriate: true,
      reason: "",
      categories: tooManyValidKeys,
      language: "en",
    });

    await moderateDiscoverRecipe(recipe.id);

    const updated = await prisma.discoverRecipe.findUniqueOrThrow({
      where: { id: recipe.id },
    });
    expect(updated.categories).toHaveLength(MAX_DISCOVER_CATEGORIES_PER_RECIPE);
  });

  it("normalizes the detected language", async () => {
    const recipe = await createPendingRecipe();
    mockModerationOutput({
      appropriate: true,
      reason: "",
      categories: [],
      language: "  ES  ",
    });

    await moderateDiscoverRecipe(recipe.id);

    const updated = await prisma.discoverRecipe.findUniqueOrThrow({
      where: { id: recipe.id },
    });
    expect(updated.language).toEqual("es");
  });

  it("falls back to the recipe's language when detection is empty", async () => {
    const recipe = await prisma.discoverRecipe.create({
      data: {
        ...discoverRecipeFactory(author.id),
        approvalState: DiscoverApprovalState.PENDING,
        language: "fr",
      },
    });
    mockModerationOutput({
      appropriate: true,
      reason: "",
      categories: [],
      language: "   ",
    });

    await moderateDiscoverRecipe(recipe.id);

    const updated = await prisma.discoverRecipe.findUniqueOrThrow({
      where: { id: recipe.id },
    });
    expect(updated.language).toEqual("fr");
  });

  it("truncates an over-long detected language", async () => {
    const recipe = await createPendingRecipe();
    mockModerationOutput({
      appropriate: true,
      reason: "",
      categories: [],
      language: "x".repeat(50),
    });

    await moderateDiscoverRecipe(recipe.id);

    const updated = await prisma.discoverRecipe.findUniqueOrThrow({
      where: { id: recipe.id },
    });
    expect(updated.language).toHaveLength(35);
  });
});
