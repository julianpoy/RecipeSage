import { describe, it, expect, vi, beforeEach } from "vitest";
import { writeFile } from "fs/promises";
import path from "path";
import { JobStatus, JobType, type ImportJobSummary } from "@recipesage/prisma";
import type { StandardJobQueueItem } from "../../JobQueueItem";
import { ImportBadFormatError } from "../../../jobs/jobErrors";

const importJobFinishCommon = vi.fn();

vi.mock("../../../index", () => ({
  importJobFinishCommon: (...args: unknown[]) => importJobFinishCommon(...args),
}));

vi.mock("../../../jobs/updateJobProgress", () => ({
  debounceJobUpdateProgress: () => () => undefined,
}));

vi.mock("./shared/s3Download", () => ({
  downloadS3ToTemp: async () => ({
    filePath: "storage-key.zip",
    [Symbol.asyncDispose]: async () => undefined,
  }),
}));

let xmlFixture = "";

vi.mock("../../../safeExtractZip", () => ({
  safeExtractZip: async (_zip: string, extractPath: string) => {
    await writeFile(path.join(extractPath, "recipes.xml"), xmlFixture);
  },
}));

const { cookmateImportJobHandler } = await import("./cookmateImportJobHandler");

const job: ImportJobSummary = {
  id: "00000000-0000-0000-0000-000000000000",
  status: JobStatus.RUN,
  type: JobType.IMPORT,
  userId: "00000000-0000-0000-0000-000000000001",
  resultCode: null,
  progress: 1,
  meta: { importLabels: [], language: "en-us" },
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

const queueItem: StandardJobQueueItem = {
  jobId: job.id,
  storageKey: "storage-key",
};

const recipeXml = (title: string) =>
  `<recipe><title>${title}</title><ingredient><li>1 cup flour</li></ingredient><recipetext><li>Mix it</li></recipetext></recipe>`;

const cookbookXml = (...titles: string[]) =>
  `<?xml version="1.0" encoding="UTF-8"?><cookbook>${titles.map(recipeXml).join("")}</cookbook>`;

const importedTitles = () =>
  importJobFinishCommon.mock.calls[0][0].standardizedRecipeImportInput.map(
    (entry: { recipe: { title: string } }) => entry.recipe.title,
  );

beforeEach(() => {
  importJobFinishCommon.mockClear();
  xmlFixture = "";
});

describe("cookmateImportJobHandler", () => {
  it("imports an export containing a single recipe", async () => {
    xmlFixture = cookbookXml("Only Recipe");

    await cookmateImportJobHandler(job, queueItem);

    expect(importedTitles()).toEqual(["Only Recipe"]);
  });

  it("imports an export containing multiple recipes", async () => {
    xmlFixture = cookbookXml("First Recipe", "Second Recipe");

    await cookmateImportJobHandler(job, queueItem);

    expect(importedTitles()).toEqual(["First Recipe", "Second Recipe"]);
  });

  it("throws a bad format error for xml that is not a cookmate export", async () => {
    xmlFixture = `<?xml version="1.0" encoding="UTF-8"?><notacookbook><foo>bar</foo></notacookbook>`;

    await expect(cookmateImportJobHandler(job, queueItem)).rejects.toThrow(
      ImportBadFormatError,
    );
  });

  it("throws a bad format error for an empty cookbook", async () => {
    xmlFixture = `<?xml version="1.0" encoding="UTF-8"?>`;

    await expect(cookmateImportJobHandler(job, queueItem)).rejects.toThrow(
      ImportBadFormatError,
    );
  });
});
