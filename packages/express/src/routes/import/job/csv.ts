import { BadRequestError } from "../../../errors";
import {
  AuthenticationEnforcement,
  defineHandler,
} from "../../../defineHandler";
import * as multer from "multer";
import { createReadStream } from "fs";
import { indexRecipes } from "@recipesage/util/server/search";
import { JobStatus, JobType } from "@prisma/client";
import {
  importStandardizedRecipes,
  StandardizedRecipeImportEntry,
} from "@recipesage/util/server/db";
import { JobMeta, prisma } from "@recipesage/prisma";
import * as Sentry from "@sentry/node";
import {
  capitalizeEachWord,
  cleanLabelTitle,
  JOB_RESULT_CODES,
} from "@recipesage/util/shared";
import {
  deletePathsSilent,
  getImportJobResultCode,
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
    const userLabels =
      req.query.labels?.split(",").map((label) => cleanLabelTitle(label)) || [];

    const cleanupPaths: string[] = [];

    const file = req.file;
    if (!file) {
      throw new BadRequestError(
        "Request must include multipart file under the 'file' field",
      );
    }

    const job = await prisma.job.create({
      data: {
        userId: res.locals.session.userId,
        type: JobType.IMPORT,
        status: JobStatus.RUN,
        progress: 1,
        meta: {
          importType: "csv",
          importLabels: userLabels,
        } satisfies JobMeta,
      },
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
            record[capitalizeEachWord(entry)];
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
                ["yield", "serves", "servings"],
                record,
              );
              const activeTime = getSimilarFields(
                ["active time", "prep time"],
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
              const notes = getSimilarFields(["notes"], record);
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
                labels: [...labels, ...userLabels],
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

      if (standardizedRecipeImportInput.length === 0) {
        throw new Error("No recipes");
      }

      await prisma.job.update({
        where: {
          id: job.id,
        },
        data: {
          progress: 25,
        },
      });

      const createdRecipeIds = await importStandardizedRecipes(
        res.locals.session.userId,
        standardizedRecipeImportInput,
      );

      const recipesToIndex = await prisma.recipe.findMany({
        where: {
          id: {
            in: createdRecipeIds,
          },
          userId: res.locals.session.userId,
        },
      });

      await prisma.job.update({
        where: {
          id: job.id,
        },
        data: {
          progress: 75,
        },
      });

      await indexRecipes(recipesToIndex);

      await prisma.job.update({
        where: {
          id: job.id,
        },
        data: {
          status: JobStatus.SUCCESS,
          resultCode: JOB_RESULT_CODES.success,
          progress: 100,
        },
      });
    };

    start()
      .catch(async (e) => {
        const isBadFormatError =
          e instanceof Error &&
          e.message === "end of central directory record signature not found";

        const isNoRecipesError =
          e instanceof Error && e.message === "No recipes";

        await prisma.job.update({
          where: {
            id: job.id,
          },
          data: {
            status: JobStatus.FAIL,
            resultCode: getImportJobResultCode({
              isBadFormat: isBadFormatError,
              isNoRecipes: isNoRecipesError,
            }),
          },
        });

        if (!isBadFormatError && !isNoRecipesError) {
          Sentry.captureException(e, {
            extra: {
              jobId: job.id,
            },
          });
          console.error(e);
        }
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
