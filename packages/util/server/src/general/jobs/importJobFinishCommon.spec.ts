import { beforeEach, describe, expect, it, vi } from "vitest";
import { JobStatus, JobType, type ImportJobSummary } from "@recipesage/prisma";
import type { StandardizedRecipeImportEntry } from "../../db/importStandardizedRecipes";

const jobUpdateMock = vi.fn();
const importStandardizedRecipesMock = vi.fn();
const recordCreditsSpentMock = vi.fn();

vi.mock("@recipesage/prisma", () => ({
  prisma: {
    job: {
      update: (...args: unknown[]) => jobUpdateMock(...args),
    },
  },
  JobStatus: {
    CREATE: "CREATE",
    RUN: "RUN",
    SUCCESS: "SUCCESS",
    FAIL: "FAIL",
  },
  JobType: {
    IMPORT: "IMPORT",
    EXPORT: "EXPORT",
    COOKBOOK: "COOKBOOK",
  },
}));

vi.mock("../../db/importStandardizedRecipes", () => ({
  importStandardizedRecipes: (...args: unknown[]) =>
    importStandardizedRecipesMock(...args),
}));

vi.mock("./updateJobProgress", () => ({
  updateJobProgress: vi.fn(),
  convertJobProgress: () => 0,
}));

vi.mock("../queue/import/processImportJob", () => ({
  IMPORT_JOB_STEP_COUNT: 3,
}));

vi.mock("../credits", () => ({
  recordCreditsSpent: (...args: unknown[]) => recordCreditsSpentMock(...args),
}));

const { importJobFinishCommon } = await import("./importJobFinishCommon");
const { ImportNoRecipesError } = await import("./jobErrors");

const job: ImportJobSummary = {
  id: "00000000-0000-0000-0000-000000000000",
  status: JobStatus.RUN,
  type: JobType.IMPORT,
  userId: "00000000-0000-0000-0000-000000000001",
  resultCode: null,
  progress: 1,
  meta: { importType: "urls", importLabels: [], language: "en-us" },
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

const entry: StandardizedRecipeImportEntry = {
  recipe: {
    title: "A recipe",
    ingredients: "1 cup flour",
    instructions: "Mix and bake.",
  },
  labels: [],
  images: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  importStandardizedRecipesMock.mockResolvedValue(["recipe-1"]);
});

describe("importJobFinishCommon", () => {
  it("persists failed urls in job meta before throwing when nothing imported", async () => {
    await expect(
      importJobFinishCommon({
        job,
        userId: job.userId,
        standardizedRecipeImportInput: [],
        importTempDirectory: undefined,
        failedCount: 2,
        failedUrls: ["https://a", "https://b"],
      }),
    ).rejects.toBeInstanceOf(ImportNoRecipesError);

    expect(jobUpdateMock).toHaveBeenCalledTimes(1);
    const data = jobUpdateMock.mock.calls[0][0].data;
    expect(data.status).toBeUndefined();
    expect(data.meta.failedCount).toBe(2);
    expect(data.meta.failedUrls).toEqual(["https://a", "https://b"]);
    expect(importStandardizedRecipesMock).not.toHaveBeenCalled();
  });

  it("does not write meta when nothing imported and there are no meta updates", async () => {
    await expect(
      importJobFinishCommon({
        job,
        userId: job.userId,
        standardizedRecipeImportInput: [],
        importTempDirectory: undefined,
      }),
    ).rejects.toBeInstanceOf(ImportNoRecipesError);

    expect(jobUpdateMock).not.toHaveBeenCalled();
  });

  it("writes failed urls and records credits on success", async () => {
    await importJobFinishCommon({
      job,
      userId: job.userId,
      standardizedRecipeImportInput: [entry],
      importTempDirectory: undefined,
      creditOperation: "importUrls",
      failedCount: 1,
      failedUrls: ["https://c"],
    });

    const successCall = jobUpdateMock.mock.calls.find(
      (call) => call[0].data.status === JobStatus.SUCCESS,
    );
    if (!successCall) throw new Error("expected a success job update");
    expect(successCall[0].data.meta.failedUrls).toEqual(["https://c"]);
    expect(successCall[0].data.meta.failedCount).toBe(1);
    expect(recordCreditsSpentMock).toHaveBeenCalledWith(
      job.userId,
      "importUrls",
    );
  });

  it("does not record credits on success when no credit operation is given", async () => {
    await importJobFinishCommon({
      job,
      userId: job.userId,
      standardizedRecipeImportInput: [entry],
      importTempDirectory: undefined,
      failedCount: 3,
      failedUrls: ["https://a", "https://b", "https://c"],
    });

    expect(recordCreditsSpentMock).not.toHaveBeenCalled();
  });
});
