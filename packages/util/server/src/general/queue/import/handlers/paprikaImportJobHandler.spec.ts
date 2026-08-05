import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "fs/promises";
import { createWriteStream } from "fs";
import { tmpdir } from "os";
import path from "path";
import { once } from "events";
import { gzipSync } from "zlib";
import ZipStream from "zip-stream";
import { JobStatus, JobType, type ImportJobSummary } from "@recipesage/prisma";
import type { StandardJobQueueItem } from "../../JobQueueItem";

const importJobFinishCommon = vi.fn();

vi.mock("../../../index", () => ({
  importJobFinishCommon: (...args: unknown[]) => importJobFinishCommon(...args),
}));

let archivePath = "";

vi.mock("./shared/s3Download", () => ({
  downloadS3ToTemp: async () => ({
    filePath: archivePath,
    [Symbol.asyncDispose]: async () => undefined,
  }),
}));

const { paprikaImportJobHandler } = await import("./paprikaImportJobHandler");

const buildArchive = async (
  dir: string,
  entries: { name: string; content: Buffer }[],
) => {
  const zipPath = path.join(dir, "export.paprikarecipes");
  const zip = new ZipStream();
  const out = createWriteStream(zipPath);
  zip.pipe(out);

  for (const { name, content } of entries) {
    await new Promise<void>((resolve, reject) => {
      zip.entry(content, { name }, (err) => (err ? reject(err) : resolve()));
    });
  }
  zip.finalize();
  await once(out, "close");

  return zipPath;
};

const paprikaRecipe = (recipe: Record<string, unknown>) =>
  gzipSync(Buffer.from(JSON.stringify(recipe), "utf-8"));

const makeJob = (): ImportJobSummary => ({
  id: "00000000-0000-0000-0000-000000000000",
  status: JobStatus.RUN,
  type: JobType.IMPORT,
  userId: "00000000-0000-0000-0000-000000000001",
  resultCode: null,
  progress: 1,
  meta: { importLabels: [], language: "en-us" },
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

const queueItem: StandardJobQueueItem = {
  jobId: "00000000-0000-0000-0000-000000000000",
  storageKey: "storage-key",
};

const finishArgs = () => {
  expect(importJobFinishCommon).toHaveBeenCalledTimes(1);
  return importJobFinishCommon.mock.calls[0][0];
};

describe("paprikaImportJobHandler", () => {
  let workDir: string;

  beforeEach(async () => {
    importJobFinishCommon.mockClear();
    workDir = await mkdtemp(path.join(tmpdir(), "paprika-"));
  });

  afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  it("imports a recipe that carries no rating", async () => {
    archivePath = await buildArchive(workDir, [
      {
        name: "Soup.paprikarecipe",
        content: paprikaRecipe({ name: "Soup", ingredients: "Water" }),
      },
    ]);

    await paprikaImportJobHandler(makeJob(), queueItem);

    const entries = finishArgs().standardizedRecipeImportInput;
    expect(entries).toHaveLength(1);
    expect(entries[0].recipe.title).toEqual("Soup");
    expect(entries[0].recipe.rating).toBeUndefined();
  });

  it("keeps a rating that was set", async () => {
    archivePath = await buildArchive(workDir, [
      {
        name: "Stew.paprikarecipe",
        content: paprikaRecipe({ name: "Stew", rating: 4 }),
      },
    ]);

    await paprikaImportJobHandler(makeJob(), queueItem);

    const entries = finishArgs().standardizedRecipeImportInput;
    expect(entries[0].recipe.rating).toEqual(4);
  });

  it("does not count unrelated files in the archive as failed recipes", async () => {
    archivePath = await buildArchive(workDir, [
      {
        name: "Soup.paprikarecipe",
        content: paprikaRecipe({ name: "Soup" }),
      },
      { name: "README.txt", content: Buffer.from("notes about my export") },
      { name: "cover.jpg", content: Buffer.from([0xff, 0xd8, 0xff]) },
    ]);

    await paprikaImportJobHandler(makeJob(), queueItem);

    const args = finishArgs();
    expect(args.standardizedRecipeImportInput).toHaveLength(1);
    expect(args.failedCount).toEqual(0);
  });

  it("skips apple double and DS_Store entries", async () => {
    archivePath = await buildArchive(workDir, [
      {
        name: "Soup.paprikarecipe",
        content: paprikaRecipe({ name: "Soup" }),
      },
      {
        name: "._Soup.paprikarecipe",
        content: Buffer.from("apple double garbage"),
      },
      { name: ".DS_Store", content: Buffer.from("ds store garbage") },
    ]);

    await paprikaImportJobHandler(makeJob(), queueItem);

    const args = finishArgs();
    expect(args.standardizedRecipeImportInput).toHaveLength(1);
    expect(args.failedCount).toEqual(0);
  });

  it("keeps importing when a single recipe file is corrupt", async () => {
    archivePath = await buildArchive(workDir, [
      {
        name: "Good.paprikarecipe",
        content: paprikaRecipe({ name: "Good" }),
      },
      {
        name: "Bad.paprikarecipe",
        content: Buffer.from("this is not gzipped json"),
      },
    ]);

    await paprikaImportJobHandler(makeJob(), queueItem);

    const args = finishArgs();
    expect(args.standardizedRecipeImportInput).toHaveLength(1);
    expect(args.failedCount).toEqual(1);
  });
});
