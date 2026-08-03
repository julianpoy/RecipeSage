import { describe, it, expect, vi, beforeEach } from "vitest";
import { mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { JobStatus, JobType, type ImportJobSummary } from "@recipesage/prisma";
import type { StandardJobQueueItem } from "../../JobQueueItem";

const importJobFinishCommon = vi.fn();
const textToRecipe = vi.fn();
const ocrImagesToRecipe = vi.fn();
const pdfToRecipe = vi.fn();
const clipUrl = vi.fn();

vi.mock("../../../index", () => ({
  importJobFinishCommon: (...args: unknown[]) => importJobFinishCommon(...args),
  translate: async () => "Automatic Import Unformatted",
  clipUrl: (...args: unknown[]) => clipUrl(...args),
}));

vi.mock("../../../../ml/index", () => ({
  OCR_MIN_VALID_TEXT: 20,
  TextToRecipeInputType: { Document: 1 },
  textToRecipe: (...args: unknown[]) => textToRecipe(...args),
  ocrImagesToRecipe: (...args: unknown[]) => ocrImagesToRecipe(...args),
  pdfToRecipe: (...args: unknown[]) => pdfToRecipe(...args),
}));

vi.mock("../../../jobs/updateJobProgress", () => ({
  debounceJobUpdateProgress: () => () => undefined,
}));

let downloadedFilePath = "";

vi.mock("./shared/s3Download", () => ({
  downloadS3ToTemp: async () => ({
    filePath: downloadedFilePath,
    [Symbol.asyncDispose]: async () => undefined,
  }),
}));

let fixtures: Record<string, string> = {};

vi.mock("../../../safeExtractZip", () => ({
  safeExtractZip: async (_zip: string, extractPath: string) => {
    for (const [name, content] of Object.entries(fixtures)) {
      await writeFile(path.join(extractPath, name), content);
    }
  },
}));

const { textfilesImportJobHandler } =
  await import("./textfilesImportJobHandler");
const { imagesImportJobHandler } = await import("./imagesImportJobHandler");
const { pdfsImportJobHandler } = await import("./pdfsImportJobHandler");
const { urlsImportJobHandler } = await import("./urlsImportJobHandler");

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

const finishArgs = () => importJobFinishCommon.mock.calls[0][0];

const findByTitle = (title: string) =>
  finishArgs().standardizedRecipeImportInput.find(
    (e: { recipe: { title: string } }) => e.recipe.title === title,
  );

const UNFORMATTED = "automatic import unformatted";

beforeEach(() => {
  importJobFinishCommon.mockClear();
  textToRecipe.mockReset();
  ocrImagesToRecipe.mockReset();
  pdfToRecipe.mockReset();
  clipUrl.mockReset();
  fixtures = {};
  downloadedFilePath = "";
});

describe("textfiles import fallback", () => {
  it("falls back to a plain-notes recipe when the LLM throws, without failing the job", async () => {
    fixtures = {
      "Good.txt": "Mix the flour and the sugar together thoroughly.",
      "Broken.txt": "Simmer the onions until they are golden brown.",
    };

    textToRecipe.mockImplementation(async (text: string) => {
      if (text.includes("onions")) throw new Error("llm exploded");
      return { recipe: { title: "Structured" }, labels: [], images: [] };
    });

    await textfilesImportJobHandler(job, queueItem);

    const args = finishArgs();
    expect(args.standardizedRecipeImportInput).toHaveLength(2);
    expect(args.partialCount).toBe(1);
    expect(args.failedCount).toBe(0);

    const fallback = findByTitle("Broken");
    expect(fallback.recipe.notes).toContain("onions");
    expect(fallback.labels).toContain(UNFORMATTED);
    expect(findByTitle("Structured").labels).not.toContain(UNFORMATTED);
  });

  it("strips a byte order mark and surrounding whitespace before reaching the LLM", async () => {
    fixtures = {
      "Bommed.txt": "\uFEFF  Mix the flour and the sugar together.  \n",
    };

    textToRecipe.mockResolvedValue({
      recipe: { title: "Structured" },
      labels: [],
      images: [],
    });

    await textfilesImportJobHandler(job, queueItem);

    expect(textToRecipe).toHaveBeenCalledTimes(1);
    expect(textToRecipe.mock.calls[0][0]).toBe(
      "Mix the flour and the sugar together.",
    );
  });
});

describe("images import failure handling", () => {
  it("skips and counts an image whose OCR fails, without failing the job", async () => {
    fixtures = { "good.jpg": "goodimg", "bad.jpg": "badimg" };
    ocrImagesToRecipe.mockImplementation(async (buffers: Buffer[]) => {
      if (buffers[0].toString().includes("bad")) throw new Error("ocr down");
      return { recipe: { title: "Structured" }, labels: [], images: [] };
    });

    await imagesImportJobHandler(job, queueItem);

    const args = finishArgs();
    expect(args.standardizedRecipeImportInput).toHaveLength(1);
    expect(args.failedCount).toBe(1);
    expect(args.standardizedRecipeImportInput[0].recipe.title).toBe(
      "Structured",
    );
  });
});

describe("pdfs import failure handling", () => {
  it("skips and counts a pdf that cannot be parsed, without failing the job", async () => {
    fixtures = { "good.pdf": "goodpdf", "bad.pdf": "badpdf" };
    pdfToRecipe.mockImplementation(async (buffer: Buffer) => {
      if (buffer.toString().includes("bad")) throw new Error("pdf broke");
      return { recipe: { title: "Structured" }, labels: [], images: [] };
    });

    await pdfsImportJobHandler(job, queueItem);

    const args = finishArgs();
    expect(args.standardizedRecipeImportInput).toHaveLength(1);
    expect(args.failedCount).toBe(1);
    expect(args.standardizedRecipeImportInput[0].recipe.title).toBe(
      "Structured",
    );
  });
});

describe("urls import failure handling", () => {
  it("skips and counts a url that cannot be clipped, without failing the job", async () => {
    const urlsFile = path.join(
      await mkdtemp(path.join(tmpdir(), "urls-")),
      "urls.txt",
    );
    await writeFile(
      urlsFile,
      "https://example.com/good\nhttps://example.com/bad",
    );
    downloadedFilePath = urlsFile;

    clipUrl.mockImplementation(async (url: string) => {
      if (url.endsWith("bad")) throw new Error("clip failed");
      return { recipe: { title: "Clipped", url }, labels: [], images: [] };
    });

    await urlsImportJobHandler(job, queueItem);

    const args = finishArgs();
    expect(args.standardizedRecipeImportInput).toHaveLength(1);
    expect(args.failedCount).toBe(1);
    expect(args.standardizedRecipeImportInput[0].recipe.title).toBe("Clipped");
  });
});
