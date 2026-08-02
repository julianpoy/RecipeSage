import { describe, it, expect, vi, beforeEach } from "vitest";
import { mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { JobStatus, JobType, type ImportJobSummary } from "@recipesage/prisma";
import type { StandardJobQueueItem } from "../../JobQueueItem";
import { jsonLDToStandardizedRecipeImportEntry } from "../../../jsonLD";
import {
  ImportBadFormatError,
  ImportNoRecipesError,
} from "../../../jobs/jobErrors";
import {
  jobErrorsToReport,
  jobErrorToResultCode,
} from "../../../jobs/getJobResultCode";
import { JOB_RESULT_CODES } from "@recipesage/util/shared";

const importJobFinishCommon = vi.fn();

vi.mock("../../../index", () => ({
  importJobFinishCommon: (...args: unknown[]) => importJobFinishCommon(...args),
  jsonLDToStandardizedRecipeImportEntry,
}));

vi.mock("../../../jobs/updateJobProgress", () => ({
  debounceJobUpdateProgress: () => () => undefined,
}));

let jsonldPath = "";

vi.mock("./shared/s3Download", () => ({
  downloadS3ToTemp: async () => ({
    filePath: jsonldPath,
    [Symbol.asyncDispose]: async () => undefined,
  }),
}));

const { jsonldImportJobHandler } = await import("./jsonldImportJobHandler");

const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);

const writeJsonLd = async (body: string, prefix = Buffer.alloc(0)) => {
  const dir = await mkdtemp(path.join(tmpdir(), "jsonldverify-"));
  const filePath = path.join(dir, "test.json");
  await writeFile(
    filePath,
    Buffer.concat([prefix, Buffer.from(body, "utf-8")]),
  );
  return filePath;
};

const recipe = (name: string, extra: Record<string, unknown> = {}) => ({
  "@type": "Recipe",
  name,
  recipeIngredient: ["1 cup flour"],
  recipeInstructions: "Mix it",
  ...extra,
});

const makeJob = (importLabels: string[] = []): ImportJobSummary => ({
  id: "00000000-0000-0000-0000-000000000000",
  status: JobStatus.RUN,
  type: JobType.IMPORT,
  userId: "00000000-0000-0000-0000-000000000001",
  resultCode: null,
  progress: 1,
  meta: { importLabels, language: "en-us" },
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

const queueItem: StandardJobQueueItem = {
  jobId: "00000000-0000-0000-0000-000000000000",
  storageKey: "storage-key",
};

const importedEntries = () => {
  expect(importJobFinishCommon).toHaveBeenCalledTimes(1);
  return importJobFinishCommon.mock.calls[0][0].standardizedRecipeImportInput;
};

const titlesOf = (entries: { recipe: { title: string } }[]) =>
  entries.map((entry) => entry.recipe.title);

describe("jsonldImportJobHandler", () => {
  beforeEach(() => {
    importJobFinishCommon.mockClear();
    jsonldPath = "";
  });

  describe("input shapes", () => {
    it("imports an array of recipes", async () => {
      jsonldPath = await writeJsonLd(
        JSON.stringify([recipe("Soup"), recipe("Stew")]),
      );

      await jsonldImportJobHandler(makeJob(), queueItem);

      expect(titlesOf(importedEntries())).toEqual(["Soup", "Stew"]);
    });

    it("imports a single recipe object", async () => {
      jsonldPath = await writeJsonLd(JSON.stringify(recipe("Soup")));

      await jsonldImportJobHandler(makeJob(), queueItem);

      expect(titlesOf(importedEntries())).toEqual(["Soup"]);
    });

    it("imports from a recipes wrapper object", async () => {
      jsonldPath = await writeJsonLd(
        JSON.stringify({ recipes: [recipe("Soup")] }),
      );

      await jsonldImportJobHandler(makeJob(), queueItem);

      expect(titlesOf(importedEntries())).toEqual(["Soup"]);
    });

    it("ignores entries that are not typed as a Recipe", async () => {
      jsonldPath = await writeJsonLd(
        JSON.stringify([
          { "@type": "WebPage", name: "Not A Recipe" },
          recipe("Soup"),
        ]),
      );

      await jsonldImportJobHandler(makeJob(), queueItem);

      expect(titlesOf(importedEntries())).toEqual(["Soup"]);
    });
  });

  describe("conversion", () => {
    it("carries recipe fields through the schema converter", async () => {
      jsonldPath = await writeJsonLd(
        JSON.stringify(
          recipe("Soup", {
            description: "A warming soup",
            recipeYield: "4 servings",
            isBasedOn: "https://example.com/soup",
          }),
        ),
      );

      await jsonldImportJobHandler(makeJob(), queueItem);

      const [entry] = importedEntries();
      expect(entry.recipe.title).toEqual("Soup");
      expect(entry.recipe.description).toEqual("A warming soup");
      expect(entry.recipe.yield).toEqual("4 servings");
      expect(entry.recipe.url).toEqual("https://example.com/soup");
      expect(entry.recipe.ingredients).toContain("flour");
      expect(entry.recipe.instructions).toContain("Mix it");
    });

    it("appends the job import labels to labels from the file", async () => {
      jsonldPath = await writeJsonLd(
        JSON.stringify(recipe("Soup", { recipeCategory: "dinner" })),
      );

      await jsonldImportJobHandler(makeJob(["from-job"]), queueItem);

      const [entry] = importedEntries();
      expect(entry.labels).toContain("dinner");
      expect(entry.labels).toContain("from-job");
    });
  });

  describe("errors", () => {
    it("reports a file with no recipes as an empty file", async () => {
      jsonldPath = await writeJsonLd(
        JSON.stringify([{ "@type": "WebPage", name: "Not A Recipe" }]),
      );

      await expect(
        jsonldImportJobHandler(makeJob(), queueItem),
      ).rejects.toThrow(ImportNoRecipesError);
      expect(importJobFinishCommon).not.toHaveBeenCalled();
    });

    it("reports invalid json as a bad file", async () => {
      jsonldPath = await writeJsonLd("not json at all");

      await expect(
        jsonldImportJobHandler(makeJob(), queueItem),
      ).rejects.toThrow(ImportBadFormatError);
      expect(importJobFinishCommon).not.toHaveBeenCalled();
    });

    it("keeps input errors out of the errors reported to sentry", async () => {
      jsonldPath = await writeJsonLd("not json at all");
      const badFile = await jsonldImportJobHandler(makeJob(), queueItem).catch(
        (e) => e,
      );

      jsonldPath = await writeJsonLd(
        JSON.stringify([{ "@type": "WebPage", name: "Not A Recipe" }]),
      );
      const emptyFile = await jsonldImportJobHandler(
        makeJob(),
        queueItem,
      ).catch((e) => e);

      expect(jobErrorToResultCode(badFile)).toEqual(JOB_RESULT_CODES.badFile);
      expect(jobErrorToResultCode(emptyFile)).toEqual(
        JOB_RESULT_CODES.emptyFile,
      );
      expect(jobErrorsToReport).not.toContain(JOB_RESULT_CODES.badFile);
      expect(jobErrorsToReport).not.toContain(JOB_RESULT_CODES.emptyFile);
    });

    it("throws when the queue item has no storage key", async () => {
      await expect(
        jsonldImportJobHandler(makeJob(), { jobId: queueItem.jobId }),
      ).rejects.toThrow("No S3 storage key");
    });

    it("reports a missing storage key as an unknown error", async () => {
      const error = await jsonldImportJobHandler(makeJob(), {
        jobId: queueItem.jobId,
      }).catch((e) => e);

      expect(jobErrorToResultCode(error)).toEqual(JOB_RESULT_CODES.unknown);
      expect(jobErrorsToReport).toContain(JOB_RESULT_CODES.unknown);
    });
  });

  describe("encoding", () => {
    it("imports a file that starts with a byte order mark", async () => {
      jsonldPath = await writeJsonLd(
        JSON.stringify([recipe("Soup")]),
        UTF8_BOM,
      );

      await jsonldImportJobHandler(makeJob(), queueItem);

      expect(titlesOf(importedEntries())).toEqual(["Soup"]);
    });

    it("imports a file with a byte order mark after leading whitespace", async () => {
      jsonldPath = await writeJsonLd(
        `  ${JSON.stringify([recipe("Soup")])}`,
        UTF8_BOM,
      );

      await jsonldImportJobHandler(makeJob(), queueItem);

      expect(titlesOf(importedEntries())).toEqual(["Soup"]);
    });
  });
});
