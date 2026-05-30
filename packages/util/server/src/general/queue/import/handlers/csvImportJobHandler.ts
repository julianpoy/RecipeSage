import type { ImportJobSummary } from "@recipesage/prisma";

import type { StandardizedRecipeImportEntry } from "../../../../db/index";
import { importJobFinishCommon } from "../../../index";
import {
  capitalizeEachWord,
  cleanLabelTitle,
  toCamelCase,
  toPascalCase,
} from "@recipesage/util/shared";
import { downloadS3ToTemp } from "./shared/s3Download";
import { createReadStream } from "fs";
import { parse } from "csv-parse";
import type { JobQueueItem } from "../../JobQueueItem";
import { pipeline } from "stream/promises";

export async function csvImportJobHandler(
  job: ImportJobSummary,
  queueItem: JobQueueItem,
): Promise<void> {
  const jobMeta = job.meta;
  const importLabels = jobMeta.importLabels || [];

  if (!queueItem.storageKey) {
    throw new Error("No S3 storage key provided for CSV import");
  }

  await using downloaded = await downloadS3ToTemp(queueItem.storageKey);

  const standardizedRecipeImportInput: StandardizedRecipeImportEntry[] = [];

  const fileReadStream = createReadStream(downloaded.filePath);
  const parser = parse({
    columns: true,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getSimilarFields = (entries: string[], record: any): string => {
    if (!record || typeof record !== "object") return "";

    for (const entry of entries) {
      const val =
        record[entry] ||
        record[entry.toUpperCase()] ||
        record[capitalizeEachWord(entry)] ||
        record[toCamelCase(entry)] ||
        record[toPascalCase(entry)];
      if (val) return val;
    }

    return "";
  };

  const negotiateUrls = (str: string) => {
    const urls = str.split(/(https?:\/\/.+?(?=https?))/);

    return urls
      .map((url) => {
        if (url.endsWith(",")) {
          return url.substring(0, url.length - 1);
        }
        return url;
      })
      .filter((el) => el.trim());
  };

  const done = new Promise<void>((resolve, reject) => {
    parser.on("readable", function () {
      try {
        let record;
        while ((record = parser.read()) !== null) {
          const title = getSimilarFields(["title", "name"], record);
          const description = getSimilarFields(["description"], record);
          const yld = getSimilarFields(
            ["yield", "serves", "servings", "quantity"],
            record,
          );
          const activeTime = getSimilarFields(
            ["active time", "prep time", "preparation time"],
            record,
          );
          const totalTime = getSimilarFields(["total time", "time"], record);
          const ingredients = getSimilarFields(["ingredients"], record);
          const instructions = getSimilarFields(
            ["instructions", "directions", "steps"],
            record,
          );
          const url = getSimilarFields(["url"], record);
          const source = getSimilarFields(["source"], record);
          const notes = [
            getSimilarFields(["notes"], record),
            getSimilarFields(["video", "videos"], record),
          ]
            .filter((el) => el.trim())
            .join("\n");
          const parseNutritionNumber = (value: string): number | undefined => {
            const parsed = parseFloat(value);
            return isNaN(parsed) ? undefined : parsed;
          };
          const nutritionServingSize =
            getSimilarFields(
              ["nutritionServingSize", "serving size"],
              record,
            ) || undefined;
          const nutritionCalories = parseNutritionNumber(
            getSimilarFields(["nutritionCalories", "calories"], record),
          );
          const nutritionTotalFat = parseNutritionNumber(
            getSimilarFields(["nutritionTotalFat", "total fat"], record),
          );
          const nutritionSaturatedFat = parseNutritionNumber(
            getSimilarFields(
              ["nutritionSaturatedFat", "saturated fat"],
              record,
            ),
          );
          const nutritionTransFat = parseNutritionNumber(
            getSimilarFields(["nutritionTransFat", "trans fat"], record),
          );
          const nutritionPolyunsaturatedFat = parseNutritionNumber(
            getSimilarFields(
              ["nutritionPolyunsaturatedFat", "polyunsaturated fat"],
              record,
            ),
          );
          const nutritionMonounsaturatedFat = parseNutritionNumber(
            getSimilarFields(
              ["nutritionMonounsaturatedFat", "monounsaturated fat"],
              record,
            ),
          );
          const nutritionCholesterol = parseNutritionNumber(
            getSimilarFields(["nutritionCholesterol", "cholesterol"], record),
          );
          const nutritionSodium = parseNutritionNumber(
            getSimilarFields(["nutritionSodium", "sodium"], record),
          );
          const nutritionTotalCarbs = parseNutritionNumber(
            getSimilarFields(
              ["nutritionTotalCarbs", "total carbohydrates", "carbohydrates"],
              record,
            ),
          );
          const nutritionDietaryFiber = parseNutritionNumber(
            getSimilarFields(
              ["nutritionDietaryFiber", "dietary fiber", "fiber"],
              record,
            ),
          );
          const nutritionTotalSugars = parseNutritionNumber(
            getSimilarFields(
              ["nutritionTotalSugars", "total sugars", "sugars"],
              record,
            ),
          );
          const nutritionAddedSugars = parseNutritionNumber(
            getSimilarFields(["nutritionAddedSugars", "added sugars"], record),
          );
          const nutritionProtein = parseNutritionNumber(
            getSimilarFields(["nutritionProtein", "protein"], record),
          );
          const nutritionVitaminD = parseNutritionNumber(
            getSimilarFields(["nutritionVitaminD", "vitamin d"], record),
          );
          const nutritionCalcium = parseNutritionNumber(
            getSimilarFields(["nutritionCalcium", "calcium"], record),
          );
          const nutritionIron = parseNutritionNumber(
            getSimilarFields(["nutritionIron", "iron"], record),
          );
          const nutritionPotassium = parseNutritionNumber(
            getSimilarFields(["nutritionPotassium", "potassium"], record),
          );
          const nutritionOtherDetails =
            [
              getSimilarFields(
                ["nutritionOtherDetails", "other nutrition details"],
                record,
              ),
              getSimilarFields(["nutrition"], record),
            ]
              .filter((el) => el.trim())
              .join("\n") || undefined;
          const imageURLs = negotiateUrls(
            getSimilarFields(
              [
                "image url",
                "image urls",
                "image",
                "images",
                "photos",
                "photo urls",
                "photo url",
                "original picture",
              ],
              record,
            ),
          );
          const rating =
            parseInt(getSimilarFields(["rating"], record)) || undefined;
          const labels = [
            ...getSimilarFields(["labels", "label"], record).split(","),
            ...getSimilarFields(["tags", "tag"], record).split(","),
            ...getSimilarFields(["categories", "category"], record).split(","),
            ...getSimilarFields(["course", "courses"], record).split(","),
            ...getSimilarFields(["cuisine", "cuisines"], record).split(","),
          ]
            .map((label) => cleanLabelTitle(label))
            .filter((el) => el.trim());

          if (!title) continue;

          standardizedRecipeImportInput.push({
            recipe: {
              title,
              description,
              yield: yld,
              activeTime,
              totalTime,
              ingredients,
              instructions,
              url,
              source,
              rating,
              notes,
              nutritionServingSize,
              nutritionCalories,
              nutritionTotalFat,
              nutritionSaturatedFat,
              nutritionTransFat,
              nutritionPolyunsaturatedFat,
              nutritionMonounsaturatedFat,
              nutritionCholesterol,
              nutritionSodium,
              nutritionTotalCarbs,
              nutritionDietaryFiber,
              nutritionTotalSugars,
              nutritionAddedSugars,
              nutritionProtein,
              nutritionVitaminD,
              nutritionCalcium,
              nutritionIron,
              nutritionPotassium,
              nutritionOtherDetails,
            },
            images: imageURLs,
            labels: [...labels, ...importLabels],
          });
        }
      } catch (e) {
        reject(e);
      }
    });

    parser.on("error", function (err) {
      reject(err);
    });

    parser.on("end", function () {
      resolve();
    });
  });

  await Promise.all([pipeline(fileReadStream, parser), done]);

  await importJobFinishCommon({
    job,
    userId: job.userId,
    standardizedRecipeImportInput,
    importTempDirectory: undefined,
  });
}
