import { describe, it, expect, vi, beforeEach } from "vitest";
import { writeFile, mkdir } from "fs/promises";
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

let files: Record<string, string> = {};

vi.mock("../../../safeExtractZip", () => ({
  safeExtractZip: async (_zip: string, extractPath: string) => {
    for (const [name, contents] of Object.entries(files)) {
      const full = path.join(extractPath, name);
      await mkdir(path.dirname(full), { recursive: true });
      await writeFile(full, contents);
    }
  },
}));

const { flavorishImportJobHandler } =
  await import("./flavorishImportJobHandler");

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

const recipeFile = (recipe: object) => JSON.stringify(recipe);

beforeEach(() => {
  importJobFinishCommon.mockClear();
  files = {};
  job.meta.importLabels = [];
});

describe("flavorishImportJobHandler", () => {
  it("maps core fields, localizes time, and renders group headers", async () => {
    files = {
      "manifest.json": JSON.stringify({ version: "2.0" }),
      "recipes/a.json": recipeFile({
        recipe: {
          title: "Chicken Piccata",
          description: "Lemony and buttery.",
          servings: 6,
          prep_time_hours: 1,
          prep_time_minutes: 10,
          total_time_hours: 1,
          total_time_minutes: 40,
          source_name: "The Modern Proper",
          source_url: "https://themodernproper.com/chicken-piccata",
          notes: "Serve immediately.",
        },
        ingredients: [
          { text: "For the sauce", sort_order: 2, is_group_header: true },
          { text: "1 cup flour", sort_order: 1, is_group_header: false },
          {
            text: "2 tablespoons capers",
            sort_order: 3,
            is_group_header: false,
          },
        ],
        instructions: [
          {
            text: "Dredge the chicken.",
            sort_order: 0,
            is_group_header: false,
          },
          { text: "Finish", sort_order: 1, is_group_header: true },
          {
            text: "Pour the sauce over.",
            sort_order: 2,
            is_group_header: false,
          },
        ],
        collections: [],
      }),
    };

    await flavorishImportJobHandler(job, queueItem);

    expect(firstRecipe().recipe).toMatchObject({
      title: "Chicken Piccata",
      description: "Lemony and buttery.",
      yield: "6 servings",
      source: "The Modern Proper",
      url: "https://themodernproper.com/chicken-piccata",
      notes: "Serve immediately.",
      activeTime: convertFromISO8601Time("PT1H10M", "en-us"),
      totalTime: convertFromISO8601Time("PT1H40M", "en-us"),
      ingredients: "1 cup flour\n[For the sauce]\n2 tablespoons capers",
      instructions: "Dredge the chicken.\n[Finish]\nPour the sauce over.",
    });
  });

  it("builds labels from category, cuisine, and collections and appends import labels", async () => {
    job.meta.importLabels = ["Imported"];
    files = {
      "recipes/a.json": recipeFile({
        recipe: {
          title: "Tagged",
          category: ["Dinner", "Kid-Friendly"],
          cuisine: ["Italian"],
          keywords: ["seo keyword"],
        },
        collections: ["lunch", "dinner"],
      }),
    };

    await flavorishImportJobHandler(job, queueItem);

    expect(firstRecipe().labels).toEqual([
      "dinner",
      "kid-friendly",
      "italian",
      "lunch",
      "dinner",
      "Imported",
    ]);
  });

  it("combines nutrition fields into nutritionOtherDetails", async () => {
    files = {
      "recipes/a.json": recipeFile({
        recipe: {
          title: "Nutritious",
          nutrition_calories: "457 calories",
          nutrition_fat_content: "30 grams fat",
          nutrition_trans_fat_content: null,
          nutrition_protein_content: "27 grams protein",
        },
        collections: [],
      }),
    };

    await flavorishImportJobHandler(job, queueItem);

    expect(firstRecipe().recipe.nutritionOtherDetails).toBe(
      "Calories: 457 calories\nFat: 30 grams fat\nProtein: 27 grams protein",
    );
  });

  it("prefers the local image file referenced by imageFilename", async () => {
    files = {
      "recipes/a.json": recipeFile({
        recipe: {
          title: "Pictured",
          image_url: "https://example.com/remote.jpg",
        },
        collections: [],
        imageFilename: "a.jpg",
      }),
      "images/a.jpg": "binary-image-contents",
    };

    await flavorishImportJobHandler(job, queueItem);

    const images = firstRecipe().images;
    expect(images).toHaveLength(1);
    expect(images[0]).toMatch(/[/\\]images[/\\]a\.jpg$/);
    expect(importJobFinishCommon.mock.calls[0][0].importTempDirectory).toEqual(
      expect.any(String),
    );
  });

  it("falls back to image_url when the local image is missing", async () => {
    files = {
      "recipes/a.json": recipeFile({
        recipe: {
          title: "Remote Only",
          image_url: "https://example.com/remote.jpg",
        },
        collections: [],
        imageFilename: "missing.jpg",
      }),
    };

    await flavorishImportJobHandler(job, queueItem);

    expect(firstRecipe().images).toEqual(["https://example.com/remote.jpg"]);
  });

  it("falls back to prep + cook time when total time is absent", async () => {
    files = {
      "recipes/a.json": recipeFile({
        recipe: {
          title: "No Total",
          prep_time_minutes: 15,
          cook_time_minutes: 25,
        },
        collections: [],
      }),
    };

    await flavorishImportJobHandler(job, queueItem);

    expect(firstRecipe().recipe).toMatchObject({
      activeTime: convertFromISO8601Time("PT15M", "en-us"),
      totalTime: convertFromISO8601Time("PT40M", "en-us"),
    });
  });

  it("skips manifest.json and macOS AppleDouble files, counting only real failures", async () => {
    files = {
      "manifest.json": "{ not valid recipe json",
      "recipes/._good.json": "AppleDouble junk",
      "__MACOSX/recipes/._good.json": "AppleDouble junk",
      "recipes/bad.json": "{ not valid json",
      "recipes/good.json": recipeFile({
        recipe: { title: "Good" },
        collections: [],
      }),
    };

    await flavorishImportJobHandler(job, queueItem);

    expect(importedRecipes()).toHaveLength(1);
    expect(firstRecipe().recipe.title).toBe("Good");
    expect(importJobFinishCommon.mock.calls[0][0].failedCount).toBe(1);
  });
});
