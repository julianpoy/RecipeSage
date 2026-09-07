import { describe, it, expect, vi, beforeEach } from "vitest";
import { mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { JobStatus, JobType, type ImportJobSummary } from "@recipesage/prisma";
import type { StandardJobQueueItem } from "../../JobQueueItem";

const importJobFinishCommon = vi.fn();
const clipUrl = vi.fn();

vi.mock("@sentry/node", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

vi.mock("../../../index", () => ({
  importJobFinishCommon: (...args: unknown[]) => importJobFinishCommon(...args),
  clipUrl: (...args: unknown[]) => clipUrl(...args),
  isRecipeRecognitionSuccess: (recipe: {
    title?: string;
    ingredients?: string;
    instructions?: string;
  }) =>
    !!recipe?.title?.trim() &&
    !!recipe?.ingredients?.trim() &&
    !!recipe?.instructions?.trim(),
}));

vi.mock("../../../jobs/updateJobProgress", () => ({
  debounceJobUpdateProgress: () => () => undefined,
}));

let urlsPath = "";

vi.mock("./shared/s3Download", () => ({
  downloadS3ToTemp: async () => ({
    filePath: urlsPath,
    [Symbol.asyncDispose]: async () => undefined,
  }),
}));

const { urlsImportJobHandler } = await import("./urlsImportJobHandler");

const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);

const writeUrlsFile = async (body: string, prefix = Buffer.alloc(0)) => {
  const dir = await mkdtemp(path.join(tmpdir(), "urlsverify-"));
  const filePath = path.join(dir, "urls.txt");
  await writeFile(
    filePath,
    Buffer.concat([prefix, Buffer.from(body, "utf-8")]),
  );
  return filePath;
};

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

const clippedUrls = () => clipUrl.mock.calls.map((call) => call[0]);

beforeEach(() => {
  importJobFinishCommon.mockClear();
  clipUrl.mockReset();
  clipUrl.mockImplementation(async (url: string) => ({
    recipe: {
      title: url,
      url,
      ingredients: "1 cup flour",
      instructions: "Mix and bake.",
    },
    labels: [],
    images: [],
  }));
  urlsPath = "";
});

describe("urlsImportJobHandler", () => {
  it("clips the first url in a file that begins with a byte order mark", async () => {
    urlsPath = await writeUrlsFile(
      "https://example.com/first\nhttps://example.com/second",
      UTF8_BOM,
    );

    await urlsImportJobHandler(job, queueItem);

    expect(clippedUrls()).toEqual([
      "https://example.com/first",
      "https://example.com/second",
    ]);
    expect(importJobFinishCommon).toHaveBeenCalledTimes(1);
    expect(importJobFinishCommon.mock.calls[0][0].failedCount).toBe(0);
  });

  it("clips urls in a file with windows line endings and trailing whitespace", async () => {
    urlsPath = await writeUrlsFile(
      "https://example.com/first  \r\n\r\n  https://example.com/second\r\n",
    );

    await urlsImportJobHandler(job, queueItem);

    expect(clippedUrls()).toEqual([
      "https://example.com/first",
      "https://example.com/second",
    ]);
  });

  it("skips a clip result with neither ingredients nor instructions", async () => {
    urlsPath = await writeUrlsFile(
      "https://example.com/good\nhttps://example.com/empty",
    );
    clipUrl.mockImplementation(async (url: string) => {
      if (url === "https://example.com/empty") {
        return { recipe: { title: "Empty", url }, labels: [], images: [] };
      }
      return {
        recipe: {
          title: url,
          url,
          ingredients: "1 cup flour",
          instructions: "Mix and bake.",
        },
        labels: [],
        images: [],
      };
    });

    await urlsImportJobHandler(job, queueItem);

    const args = importJobFinishCommon.mock.calls[0][0];
    expect(args.standardizedRecipeImportInput).toHaveLength(1);
    expect(args.standardizedRecipeImportInput[0].recipe.url).toBe(
      "https://example.com/good",
    );
    expect(args.failedCount).toBe(1);
    expect(args.failedUrls).toEqual(["https://example.com/empty"]);
  });

  it("persists a clip that has content but does not count it as failed", async () => {
    urlsPath = await writeUrlsFile("https://example.com/partial");
    clipUrl.mockImplementation(async (url: string) => ({
      recipe: { title: "Partial", url, ingredients: "1 cup flour" },
      labels: [],
      images: [],
    }));

    await urlsImportJobHandler(job, queueItem);

    const args = importJobFinishCommon.mock.calls[0][0];
    expect(args.standardizedRecipeImportInput).toHaveLength(1);
    expect(args.failedCount).toBe(0);
    expect(args.failedUrls).toEqual([]);
  });

  it("records a clip that throws as a failed url", async () => {
    urlsPath = await writeUrlsFile(
      "https://example.com/ok\nhttps://example.com/boom",
    );
    clipUrl.mockImplementation(async (url: string) => {
      if (url === "https://example.com/boom") {
        throw new Error("fetch failed");
      }
      return {
        recipe: {
          title: url,
          url,
          ingredients: "1 cup flour",
          instructions: "Mix and bake.",
        },
        labels: [],
        images: [],
      };
    });

    await urlsImportJobHandler(job, queueItem);

    const args = importJobFinishCommon.mock.calls[0][0];
    expect(args.standardizedRecipeImportInput).toHaveLength(1);
    expect(args.failedCount).toBe(1);
    expect(args.failedUrls).toEqual(["https://example.com/boom"]);
  });

  it("does not charge credits when 25% or fewer urls are recognized", async () => {
    urlsPath = await writeUrlsFile(
      [
        "https://example.com/1",
        "https://example.com/2",
        "https://example.com/3",
        "https://example.com/4",
      ].join("\n"),
    );
    clipUrl.mockImplementation(async (url: string) => {
      if (url === "https://example.com/1") {
        return {
          recipe: {
            title: "Full",
            url,
            ingredients: "1 cup flour",
            instructions: "Mix and bake.",
          },
          labels: [],
          images: [],
        };
      }
      return { recipe: { title: "Empty", url }, labels: [], images: [] };
    });

    await urlsImportJobHandler(job, queueItem);

    const args = importJobFinishCommon.mock.calls[0][0];
    expect(args.creditOperation).toBeUndefined();
  });

  it("charges credits when more than 25% of urls are recognized", async () => {
    urlsPath = await writeUrlsFile(
      [
        "https://example.com/1",
        "https://example.com/2",
        "https://example.com/3",
        "https://example.com/4",
      ].join("\n"),
    );
    const recognized = new Set([
      "https://example.com/1",
      "https://example.com/2",
    ]);
    clipUrl.mockImplementation(async (url: string) => {
      if (recognized.has(url)) {
        return {
          recipe: {
            title: "Full",
            url,
            ingredients: "1 cup flour",
            instructions: "Mix and bake.",
          },
          labels: [],
          images: [],
        };
      }
      return { recipe: { title: "Empty", url }, labels: [], images: [] };
    });

    await urlsImportJobHandler(job, queueItem);

    const args = importJobFinishCommon.mock.calls[0][0];
    expect(args.creditOperation).toBe("importUrls");
  });
});
