import { describe, it, expect, vi, beforeEach } from "vitest";
import { mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { JobStatus, JobType, type ImportJobSummary } from "@recipesage/prisma";
import type { StandardJobQueueItem } from "../../JobQueueItem";
import { MAX_IMAGES } from "../../../../db/index";

const importJobFinishCommon = vi.fn();
const textToRecipe = vi.fn();

vi.mock("../../../index", () => ({
  importJobFinishCommon: (...args: unknown[]) => importJobFinishCommon(...args),
  translate: async () => "Automatic Import Unformatted",
}));

vi.mock("../../../../ml/index", () => ({
  OCR_MIN_VALID_TEXT: 20,
  TextToRecipeInputType: { Document: 1 },
  textToRecipe: (...args: unknown[]) => textToRecipe(...args),
  pdfToRecipe: vi.fn(),
  ocrImagesToRecipe: vi.fn(),
}));

vi.mock("../../../jobs/updateJobProgress", () => ({
  debounceJobUpdateProgress: () => () => undefined,
}));

let enexPath = "";

vi.mock("./shared/s3Download", () => ({
  downloadS3ToTemp: async () => ({
    filePath: enexPath,
    [Symbol.asyncDispose]: async () => undefined,
  }),
}));

const { enexImportJobHandler } = await import("./enexImportJobHandler");

const makeNote = (title: string, body: string, resources = "") =>
  `<note><title>${title}</title><content><![CDATA[<?xml version="1.0" encoding="UTF-8"?><en-note><div>${body}</div></en-note>]]></content><tag>dinner</tag>${resources}</note>`;

const makeImageResource = (index: number) =>
  `<resource><data encoding="base64">${Buffer.from(`image-${index}`).toString(
    "base64",
  )}</data><mime>image/png</mime></resource>`;

const buildEnex = async (notes: string[]) => {
  const dir = await mkdtemp(path.join(tmpdir(), "enexverify-"));
  const filePath = path.join(dir, "test.enex");
  await writeFile(
    filePath,
    `<?xml version="1.0" encoding="UTF-8"?><en-export>${notes.join("")}</en-export>`,
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

describe("enex import fallback", () => {
  beforeEach(() => {
    importJobFinishCommon.mockClear();
    textToRecipe.mockReset();
  });

  it("imports a note as an unformatted recipe when the LLM throws", async () => {
    enexPath = await buildEnex([
      makeNote(
        "Good Recipe",
        "Mix the flour and the sugar together thoroughly.",
      ),
      makeNote(
        "Broken Recipe",
        "Simmer the onions until they are golden brown.",
      ),
    ]);

    textToRecipe.mockImplementation(async (text: string) => {
      if (text.includes("onions")) throw new Error("llm exploded");
      return {
        recipe: { title: "LLM Title", ingredients: "flour", instructions: "" },
        labels: [],
        images: [],
      };
    });

    await enexImportJobHandler(job, queueItem);

    expect(importJobFinishCommon).toHaveBeenCalledTimes(1);
    const args = importJobFinishCommon.mock.calls[0][0];

    expect(args.standardizedRecipeImportInput).toHaveLength(2);
    expect(args.partialCount).toBe(1);
    expect(args.failedCount).toBe(0);

    const fallback = args.standardizedRecipeImportInput.find(
      (e: { recipe: { title: string } }) => e.recipe.title === "Broken Recipe",
    );
    expect(fallback.recipe.notes).toContain("onions");
    expect(fallback.labels).toContain("automatic import unformatted");
    expect(fallback.labels).toContain("dinner");

    const good = args.standardizedRecipeImportInput.find(
      (e: { recipe: { title: string } }) => e.recipe.title === "Good Recipe",
    );
    expect(good.labels).not.toContain("automatic import unformatted");
  });

  it("stages at most MAX_IMAGES images from a single note", async () => {
    const resources = Array.from({ length: 25 }, (_, index) =>
      makeImageResource(index),
    ).join("");

    enexPath = await buildEnex([
      makeNote(
        "Many Photos",
        "Bake the bread until the crust is deep golden.",
        resources,
      ),
    ]);

    textToRecipe.mockResolvedValue({
      recipe: { title: "LLM Title", ingredients: "flour", instructions: "" },
      labels: [],
      images: [],
    });

    await enexImportJobHandler(job, queueItem);

    const args = importJobFinishCommon.mock.calls[0][0];
    expect(args.standardizedRecipeImportInput).toHaveLength(1);
    expect(args.standardizedRecipeImportInput[0].images).toHaveLength(
      MAX_IMAGES,
    );
  });

  it("does not fail the job when every note fails", async () => {
    enexPath = await buildEnex([
      makeNote("A", "Chop the carrots into thin even slices."),
      makeNote("B", "Roast the peppers until the skins blister."),
    ]);

    textToRecipe.mockRejectedValue(new Error("llm down"));

    await enexImportJobHandler(job, queueItem);

    const args = importJobFinishCommon.mock.calls[0][0];
    expect(args.standardizedRecipeImportInput).toHaveLength(2);
    expect(args.partialCount).toBe(2);
  });
});
