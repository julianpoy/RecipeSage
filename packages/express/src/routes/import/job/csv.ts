import { BadRequestError } from "../../../errors";
import {
  AuthenticationEnforcement,
  defineHandler,
} from "../../../defineHandler";
import multer from "multer";
import { createReadStream } from "fs";
import { StandardizedRecipeImportEntry } from "@recipesage/util/server/db";
import {
  capitalizeEachWord,
  cleanLabelTitle,
  toCamelCase,
  toPascalCase,
} from "@recipesage/util/shared";
import {
  deletePathsSilent,
  importJobFailCommon,
  importJobFinishCommon,
  importJobSetupCommon,
} from "@recipesage/util/server/general";
import { z } from "zod";
import { parse } from "csv-parse";

const schema = {
  query: z.object({
    labels: z.string().optional(),
  }),
};

export const csvHandler = defineHandler(
  {
    schema,
    authentication: AuthenticationEnforcement.Required,
    beforeHandlers: [
      multer({
        dest: "/tmp/import/",
      }).single("file"),
    ],
  },
  async (req, res) => {
    const userId = res.locals.session.userId;

    const cleanupPaths: string[] = [];

    const file = req.file;
    if (!file) {
      throw new BadRequestError(
        "Request must include multipart file under the 'file' field",
      );
    }

    const { job, timer, importLabels } = await importJobSetupCommon({
      userId,
      importType: "csv",
      labels: req.query.labels?.split(",") || [],
    });

    // We complete this work outside of the scope of the request
    const start = async () => {
      const standardizedRecipeImportInput: StandardizedRecipeImportEntry[] = [];

      const fileReadStream = createReadStream(file.path);
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
              const totalTime = getSimilarFields(
                ["total time", "time"],
                record,
              );
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
        userId,
        standardizedRecipeImportInput,
        importTempDirectory: undefined,
      });
    };

    start()
      .catch(async (error) => {
        await importJobFailCommon({
          timer,
          job,
          error,
        });
      })
      .finally(async () => {
        await deletePathsSilent(cleanupPaths);
      });

    return {
      statusCode: 201,
      data: {
        jobId: job.id,
      },
    };
  },
);
