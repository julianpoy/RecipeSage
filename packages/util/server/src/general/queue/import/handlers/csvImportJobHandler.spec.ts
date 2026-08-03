import { describe, it, expect, vi, beforeEach } from "vitest";
import { mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { JobStatus, JobType, type ImportJobSummary } from "@recipesage/prisma";
import type { StandardJobQueueItem } from "../../JobQueueItem";
import { ImportBadFormatError } from "../../../jobs/jobErrors";

const importJobFinishCommon = vi.fn();

vi.mock("../../../index", () => ({
  importJobFinishCommon: (...args: unknown[]) => importJobFinishCommon(...args),
}));

let csvPath = "";

vi.mock("./shared/s3Download", () => ({
  downloadS3ToTemp: async () => ({
    filePath: csvPath,
    [Symbol.asyncDispose]: async () => undefined,
  }),
}));

const { csvImportJobHandler } = await import("./csvImportJobHandler");

const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);

const writeCsv = async (body: string, prefix = Buffer.alloc(0)) => {
  const dir = await mkdtemp(path.join(tmpdir(), "csvverify-"));
  const filePath = path.join(dir, "test.csv");
  await writeFile(
    filePath,
    Buffer.concat([prefix, Buffer.from(body, "utf-8")]),
  );
  return filePath;
};

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

describe("csvImportJobHandler", () => {
  beforeEach(() => {
    importJobFinishCommon.mockClear();
    csvPath = "";
  });

  describe("column mapping", () => {
    it("maps the core recipe columns", async () => {
      csvPath = await writeCsv(
        "title,description,ingredients,instructions,url,source,notes\n" +
          "Soup,Warming,flour,Mix it,https://example.com,A Book,Tasty\n",
      );

      await csvImportJobHandler(makeJob(), queueItem);

      const [entry] = importedEntries();
      expect(entry.recipe.title).toEqual("Soup");
      expect(entry.recipe.description).toEqual("Warming");
      expect(entry.recipe.ingredients).toEqual("flour");
      expect(entry.recipe.instructions).toEqual("Mix it");
      expect(entry.recipe.url).toEqual("https://example.com");
      expect(entry.recipe.source).toEqual("A Book");
      expect(entry.recipe.notes).toEqual("Tasty");
    });

    it("accepts alternate column names for the same field", async () => {
      csvPath = await writeCsv(
        "name,directions,serves,time\nSoup,Mix it,4,30 min\n",
      );

      await csvImportJobHandler(makeJob(), queueItem);

      const [entry] = importedEntries();
      expect(entry.recipe.title).toEqual("Soup");
      expect(entry.recipe.instructions).toEqual("Mix it");
      expect(entry.recipe.yield).toEqual("4");
      expect(entry.recipe.totalTime).toEqual("30 min");
    });

    it("matches column names case insensitively", async () => {
      csvPath = await writeCsv("TITLE,Ingredients\nSoup,flour\n");

      await csvImportJobHandler(makeJob(), queueItem);

      const [entry] = importedEntries();
      expect(entry.recipe.title).toEqual("Soup");
      expect(entry.recipe.ingredients).toEqual("flour");
    });

    it("matches multi word columns written in camel and pascal case", async () => {
      csvPath = await writeCsv(
        "title,activeTime,ServingSize\nSoup,20 min,2 cups\n",
      );

      await csvImportJobHandler(makeJob(), queueItem);

      const [entry] = importedEntries();
      expect(entry.recipe.activeTime).toEqual("20 min");
      expect(entry.recipe.nutritionServingSize).toEqual("2 cups");
    });

    it("joins notes and video columns", async () => {
      csvPath = await writeCsv(
        "title,notes,video\nSoup,Tasty,https://video.example.com\n",
      );

      await csvImportJobHandler(makeJob(), queueItem);

      const [entry] = importedEntries();
      expect(entry.recipe.notes).toContain("Tasty");
      expect(entry.recipe.notes).toContain("https://video.example.com");
    });
  });

  describe("rows", () => {
    it("imports every row of a multi row file", async () => {
      csvPath = await writeCsv("title\nSoup\nStew\nPie\n");

      await csvImportJobHandler(makeJob(), queueItem);

      expect(
        importedEntries().map(
          (entry: { recipe: { title: string } }) => entry.recipe.title,
        ),
      ).toEqual(["Soup", "Stew", "Pie"]);
    });

    it("skips rows that have no title", async () => {
      csvPath = await writeCsv(
        "title,ingredients\nSoup,flour\n,orphaned\nStew,water\n",
      );

      await csvImportJobHandler(makeJob(), queueItem);

      expect(
        importedEntries().map(
          (entry: { recipe: { title: string } }) => entry.recipe.title,
        ),
      ).toEqual(["Soup", "Stew"]);
    });
  });

  describe("parsed values", () => {
    it("parses nutrition numbers and leaves unparseable ones undefined", async () => {
      csvPath = await writeCsv(
        "title,calories,protein,sodium\nSoup,250,12.5,not a number\n",
      );

      await csvImportJobHandler(makeJob(), queueItem);

      const [entry] = importedEntries();
      expect(entry.recipe.nutritionCalories).toEqual(250);
      expect(entry.recipe.nutritionProtein).toEqual(12.5);
      expect(entry.recipe.nutritionSodium).toBeUndefined();
    });

    it("parses a rating and leaves an unparseable one undefined", async () => {
      csvPath = await writeCsv("title,rating\nSoup,4\nStew,great\n");

      await csvImportJobHandler(makeJob(), queueItem);

      const entries = importedEntries();
      expect(entries[0].recipe.rating).toEqual(4);
      expect(entries[1].recipe.rating).toBeUndefined();
    });

    it("collects labels from every label column and adds the job labels", async () => {
      csvPath = await writeCsv(
        "title,labels,tags,categories,course,cuisine\n" +
          "Soup,Dinner,quick,weeknight,main,italian\n",
      );

      await csvImportJobHandler(makeJob(["from-job"]), queueItem);

      const [entry] = importedEntries();
      expect(entry.labels).toEqual([
        "dinner",
        "quick",
        "weeknight",
        "main",
        "italian",
        "from-job",
      ]);
    });

    it("drops empty labels when only some label columns are present", async () => {
      csvPath = await writeCsv("title,labels\nSoup,dinner\n");

      await csvImportJobHandler(makeJob(), queueItem);

      const [entry] = importedEntries();
      expect(entry.labels).toEqual(["dinner"]);
    });

    it("splits multiple image urls that run together", async () => {
      csvPath = await writeCsv(
        "title,image url\nSoup,https://a.example.com/1.jpghttps://b.example.com/2.jpg\n",
      );

      await csvImportJobHandler(makeJob(), queueItem);

      const [entry] = importedEntries();
      expect(entry.images).toEqual([
        "https://a.example.com/1.jpg",
        "https://b.example.com/2.jpg",
      ]);
    });

    it("splits multiple image urls separated by a comma", async () => {
      csvPath = await writeCsv(
        'title,image url\nSoup,"https://a.example.com/1.jpg,https://b.example.com/2.jpg"\n',
      );

      await csvImportJobHandler(makeJob(), queueItem);

      const [entry] = importedEntries();
      expect(entry.images).toEqual([
        "https://a.example.com/1.jpg",
        "https://b.example.com/2.jpg",
      ]);
    });
  });

  describe("errors", () => {
    it("throws a bad format error for malformed csv", async () => {
      csvPath = await writeCsv('title,ingredients\n"unclosed,flour\n');

      await expect(csvImportJobHandler(makeJob(), queueItem)).rejects.toThrow(
        ImportBadFormatError,
      );
      expect(importJobFinishCommon).not.toHaveBeenCalled();
    });

    it("throws when the queue item has no storage key", async () => {
      await expect(
        csvImportJobHandler(makeJob(), { jobId: queueItem.jobId }),
      ).rejects.toThrow("No S3 storage key");
    });
  });

  describe("encoding", () => {
    it("imports a file with an unquoted header and a byte order mark", async () => {
      csvPath = await writeCsv("title,ingredients\nSoup,flour\n", UTF8_BOM);

      await csvImportJobHandler(makeJob(), queueItem);

      const [entry] = importedEntries();
      expect(entry.recipe.title).toEqual("Soup");
      expect(entry.recipe.ingredients).toEqual("flour");
    });

    it("imports a file with a quoted header and a byte order mark", async () => {
      csvPath = await writeCsv(
        '"title","ingredients"\n"Soup","flour"\n',
        UTF8_BOM,
      );

      await csvImportJobHandler(makeJob(), queueItem);

      const [entry] = importedEntries();
      expect(entry.recipe.title).toEqual("Soup");
      expect(entry.recipe.ingredients).toEqual("flour");
    });
  });
});
