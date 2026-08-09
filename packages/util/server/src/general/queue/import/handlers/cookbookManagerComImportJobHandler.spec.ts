import { describe, it, expect, vi, beforeEach } from "vitest";
import { writeFile } from "fs/promises";
import path from "path";
import { JobStatus, JobType, type ImportJobSummary } from "@recipesage/prisma";
import type { StandardJobQueueItem } from "../../JobQueueItem";
import { convertFromISO8601Time } from "../../../convertFromISO8601Time";

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

let yamlFixtures: Record<string, string> = {};

vi.mock("../../../safeExtractZip", () => ({
  safeExtractZip: async (_zip: string, extractPath: string) => {
    for (const [name, contents] of Object.entries(yamlFixtures)) {
      await writeFile(path.join(extractPath, name), contents);
    }
  },
}));

const { cookbookManagerComImportJobHandler } =
  await import("./cookbookManagerComImportJobHandler");

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

const importedRecipes = () => {
  expect(importJobFinishCommon).toHaveBeenCalledTimes(1);
  return importJobFinishCommon.mock.calls[0][0].standardizedRecipeImportInput;
};

const firstRecipe = () => importedRecipes()[0];

beforeEach(() => {
  importJobFinishCommon.mockClear();
  yamlFixtures = {};
  job.meta.importLabels = [];
});

describe("cookbookManagerComImportJobHandler", () => {
  it("maps core fields and converts colon lines to section headers", async () => {
    yamlFixtures = {
      "recipe.yml": `name: Lemon Bars
servings: 24 bars
prep_time: PT30M
cook_time: PT46M
ingredients:
  - "Shortbread:"
  - 1 cup butter
  - "Lemon filling:"
  - 6 large eggs
directions:
  - ""
  - "Make the crust:"
  - mix all ingredients
  - "Make the filling:"
  - pour over crust
`,
    };

    await cookbookManagerComImportJobHandler(job, queueItem);

    expect(firstRecipe().recipe).toMatchObject({
      title: "Lemon Bars",
      yield: "24 bars",
      ingredients: "[Shortbread]\n1 cup butter\n[Lemon filling]\n6 large eggs",
      instructions:
        "[Make the crust]\nmix all ingredients\n[Make the filling]\npour over crust",
      activeTime: convertFromISO8601Time("PT30M", "en-us"),
      totalTime: convertFromISO8601Time("PT1H16M", "en-us"),
    });
  });

  it("cleans tags into labels and appends import labels", async () => {
    job.meta.importLabels = ["Imported"];
    yamlFixtures = {
      "recipe.yml": `name: Tagged
tags:
  - Desserts 🍪
  - Freezer-Friendly 🧊
ingredients:
  - 1 cup flour
`,
    };

    await cookbookManagerComImportJobHandler(job, queueItem);

    expect(firstRecipe().labels).toEqual([
      "desserts 🍪",
      "freezer-friendly 🧊",
      "Imported",
    ]);
  });

  it("preserves nutrition text and only accepts ratings from 1 to 5", async () => {
    yamlFixtures = {
      "in-range.yml": `name: Rated
rating: 5
nutrition: |-
  Calories: 45
  Fat: 5
ingredients:
  - 1 cup flour
`,
      "out-of-range.yml": `name: Unrated
rating: 0
ingredients:
  - 1 cup flour
`,
    };

    await cookbookManagerComImportJobHandler(job, queueItem);

    const byTitle = Object.fromEntries(
      importedRecipes().map((entry: { recipe: { title: string } }) => [
        entry.recipe.title,
        entry.recipe,
      ]),
    );

    expect(byTitle["Rated"]).toMatchObject({
      rating: 5,
      nutritionOtherDetails: "Calories: 45\nFat: 5",
    });
    expect(byTitle["Unrated"].rating).toBeUndefined();
  });

  it("appends the video url to notes as its own line", async () => {
    yamlFixtures = {
      "recipe.yml": `name: With Video
notes: Some helpful note
video: https://example.com/video.mp4
ingredients:
  - 1 cup flour
`,
    };

    await cookbookManagerComImportJobHandler(job, queueItem);

    expect(firstRecipe().recipe.notes).toBe(
      "Some helpful note\n\nhttps://example.com/video.mp4",
    );
  });

  it("converts last_cook into a YYYY-MM-DD datestamp", async () => {
    yamlFixtures = {
      "recipe.yml": `name: Made Recently
last_cook: 2024-10-22 00:00:00
ingredients:
  - 1 cup flour
`,
    };

    await cookbookManagerComImportJobHandler(job, queueItem);

    expect(firstRecipe().recipe.lastMadeAt).toBe("2024-10-22");
  });

  it("combines the primary image and extra images, de-duplicated", async () => {
    yamlFixtures = {
      "recipe.yml": `name: Pictured
image: https://example.com/a.jpg
images:
  - https://example.com/a.jpg
  - https://example.com/b.jpg
ingredients:
  - 1 cup flour
`,
    };

    await cookbookManagerComImportJobHandler(job, queueItem);

    expect(firstRecipe().images).toEqual([
      "https://example.com/a.jpg",
      "https://example.com/b.jpg",
    ]);
  });

  it("skips non-recipe documents and content-less recipes as failures", async () => {
    yamlFixtures = {
      "list.yml": `- just
- a
- list
`,
      "empty.yml": `servings: 4 servings
`,
      "valid.yml": `name: Real Recipe
ingredients:
  - 1 cup flour
`,
    };

    await cookbookManagerComImportJobHandler(job, queueItem);

    expect(
      importedRecipes().map(
        (e: { recipe: { title: string } }) => e.recipe.title,
      ),
    ).toEqual(["Real Recipe"]);
    expect(importJobFinishCommon.mock.calls[0][0].failedCount).toBe(2);
  });

  it("leaves times empty when no durations are present", async () => {
    yamlFixtures = {
      "recipe.yml": `name: No Times
ingredients:
  - 1 cup flour
`,
    };

    await cookbookManagerComImportJobHandler(job, queueItem);

    expect(firstRecipe().recipe).toMatchObject({
      activeTime: "",
      totalTime: "",
    });
  });
});
