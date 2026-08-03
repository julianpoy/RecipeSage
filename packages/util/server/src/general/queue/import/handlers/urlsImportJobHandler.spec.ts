import { describe, it, expect, vi, beforeEach } from "vitest";
import { mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { JobStatus, JobType, type ImportJobSummary } from "@recipesage/prisma";
import type { StandardJobQueueItem } from "../../JobQueueItem";

const importJobFinishCommon = vi.fn();
const clipUrl = vi.fn();

vi.mock("../../../index", () => ({
  importJobFinishCommon: (...args: unknown[]) => importJobFinishCommon(...args),
  clipUrl: (...args: unknown[]) => clipUrl(...args),
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
    recipe: { title: url, url },
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
});
