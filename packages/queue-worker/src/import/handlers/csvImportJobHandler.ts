import type { Job } from "@prisma/client";
import { type JobMeta } from "@recipesage/prisma";
import type { StandardizedRecipeImportEntry } from "@recipesage/util/server/db";
import {
  importJobFailCommon,
  importJobFinishCommon,
  metrics,
} from "@recipesage/util/server/general";
import {
  capitalizeEachWord,
  cleanLabelTitle,
  toCamelCase,
  toPascalCase,
} from "@recipesage/util/shared";
import { downloadS3ToTemp } from "./shared/s3Download";
import { createReadStream } from "fs";
import { parse } from "csv-parse";
import type { JobQueueItem } from "./JobQueueItem";

export async function csvImportJobHandler(
  job: Job,
  queueItem: JobQueueItem,
): Promise<void> {
  const timer = metrics.jobFinished.startTimer();
  const jobMeta = job.meta as JobMeta;
  const importLabels = jobMeta.importLabels || [];

  try {
    if (!queueItem.s3StorageKey) {
      throw new Error("No S3 storage key provided for CSV import");
    }

    await using downloaded = await downloadS3ToTemp(queueItem.s3StorageKey);

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
              getSimilarFields(["nutrition"], record),
              getSimilarFields(["video", "videos"], record),
            ]
              .filter((el) => el.trim())
              .join("\n");
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
              ...getSimilarFields(["categories", "category"], record).split(
                ",",
              ),
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

    fileReadStream.pipe(parser);

    await done;

    await importJobFinishCommon({
      timer,
      job,
      userId: job.userId,
      standardizedRecipeImportInput,
      importTempDirectory: undefined,
    });
  } catch (error) {
    await importJobFailCommon({
      timer,
      job,
      error,
    });
  }
}
