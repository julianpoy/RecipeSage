import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, rm, readdir, stat } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { JobStatus, JobType, type ImportJobSummary } from "@recipesage/prisma";
import type { StandardJobQueueItem } from "../../JobQueueItem";
import { MAX_IMAGES } from "../../../../db/index";
import { MAX_NOTE_BYTES } from "./shared/enexParsing";

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

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

const buildEnex = async (notes: string[]) => {
  const dir = await mkdtemp(path.join(tmpdir(), "enexverify-"));
  temporaryDirectories.push(dir);
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
    importJobFinishCommon.mockReset();
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

  it("imports a note whose image is larger than MAX_NOTE_BYTES", async () => {
    const imageBytes = Buffer.alloc(MAX_NOTE_BYTES, 3);
    enexPath = await buildEnex([
      makeNote(
        "Big Photo",
        "Knead the dough for ten minutes until smooth.",
        `<resource><data encoding="base64">${imageBytes.toString("base64")}</data><mime>image/jpeg</mime></resource>`,
      ),
    ]);

    textToRecipe.mockResolvedValue({
      recipe: { title: "LLM Title", ingredients: "flour", instructions: "" },
      labels: [],
      images: [],
    });

    let imageSize = 0;
    importJobFinishCommon.mockImplementation(
      async (args: {
        standardizedRecipeImportInput: { images: string[] }[];
      }) => {
        const [imagePath] = args.standardizedRecipeImportInput[0].images;
        imageSize = (await stat(imagePath)).size;
      },
    );

    await enexImportJobHandler(job, queueItem);

    const args = importJobFinishCommon.mock.calls[0][0];
    expect(args.failedCount).toBe(0);
    expect(args.standardizedRecipeImportInput).toHaveLength(1);
    expect(args.standardizedRecipeImportInput[0].images).toHaveLength(1);
    expect(imageSize).toBe(imageBytes.length);
  });

  it("deletes resource files beyond MAX_IMAGES and of unsupported types", async () => {
    const resources = [
      ...Array.from({ length: MAX_IMAGES + 2 }, (_, index) =>
        makeImageResource(index),
      ),
      `<resource><data encoding="base64">${Buffer.from("audio").toString(
        "base64",
      )}</data><mime>audio/wav</mime></resource>`,
    ].join("");

    enexPath = await buildEnex([
      makeNote(
        "Photos And Audio",
        "Whisk the eggs with the cream until frothy.",
        resources,
      ),
    ]);

    textToRecipe.mockResolvedValue({
      recipe: { title: "LLM Title", ingredients: "eggs", instructions: "" },
      labels: [],
      images: [],
    });

    let filesInTempDirectory: string[] = [];
    importJobFinishCommon.mockImplementation(
      async (args: { importTempDirectory: string }) => {
        filesInTempDirectory = await readdir(args.importTempDirectory);
      },
    );

    await enexImportJobHandler(job, queueItem);

    const args = importJobFinishCommon.mock.calls[0][0];
    expect(args.standardizedRecipeImportInput[0].images).toHaveLength(
      MAX_IMAGES,
    );
    expect(filesInTempDirectory).toHaveLength(MAX_IMAGES);
  });

  it("deletes the resource files of a note that cannot be parsed", async () => {
    enexPath = await buildEnex([
      `<note><title>Broken${makeImageResource(0)}</note>`,
      makeNote("Good", "Fold the egg whites gently into the batter."),
    ]);

    textToRecipe.mockResolvedValue({
      recipe: { title: "LLM Title", ingredients: "eggs", instructions: "" },
      labels: [],
      images: [],
    });

    let filesInTempDirectory: string[] = [];
    importJobFinishCommon.mockImplementation(
      async (args: { importTempDirectory: string }) => {
        filesInTempDirectory = await readdir(args.importTempDirectory);
      },
    );

    await enexImportJobHandler(job, queueItem);

    const args = importJobFinishCommon.mock.calls[0][0];
    expect(args.failedCount).toBe(1);
    expect(args.standardizedRecipeImportInput).toHaveLength(1);
    expect(filesInTempDirectory).toEqual([]);
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
