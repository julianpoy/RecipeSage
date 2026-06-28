import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  prisma,
  User,
  DiscoverApprovalState,
  DiscoverReportSource,
} from "@recipesage/prisma";
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
});
