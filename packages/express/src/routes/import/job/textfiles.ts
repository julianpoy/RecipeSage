import { BadRequestError } from "../../../errors";
import {
  AuthenticationEnforcement,
  defineHandler,
} from "../../../defineHandler";
import * as multer from "multer";
import * as fs from "fs/promises";
import * as extract from "extract-zip";
import * as path from "path";
import { indexRecipes } from "@recipesage/util/server/search";
import { JobStatus, JobType } from "@prisma/client";
import {
  importStandardizedRecipes,
  StandardizedRecipeImportEntry,
} from "@recipesage/util/server/db";
import {
  textToRecipe,
  TextToRecipeInputType,
} from "@recipesage/util/server/ml";
import { JobMeta, prisma } from "@recipesage/prisma";
import * as Sentry from "@sentry/node";
import {
  deletePathsSilent,
  getImportJobResultCode,
} from "@recipesage/util/server/general";
import { cleanLabelTitle, JOB_RESULT_CODES } from "@recipesage/util/shared";
import { z } from "zod";

const schema = {
  query: z.object({
    labels: z.string().optional(),
  }),
};

export const textfilesHandler = defineHandler(
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
          importType: "textFiles",
          importLabels: userLabels,
        } satisfies JobMeta,
      },
    });

    // We complete this work outside of the scope of the request
    const start = async () => {
      const zipPath = file.path;
      cleanupPaths.push(zipPath);
      const extractPath = zipPath + "-extract";
      cleanupPaths.push(extractPath);

      await extract(zipPath, { dir: extractPath });

      const fileNames = await fs.readdir(extractPath);

      const standardizedRecipeImportInput: StandardizedRecipeImportEntry[] = [];
      for (const fileName of fileNames) {
        const filePath = path.join(extractPath, fileName);

        if (!filePath.endsWith(".txt")) {
          continue;
        }

        const recipeText = await fs.readFile(filePath, "utf-8");

        const images = [];
        const baseName = path.basename(fileName);
        const possibleImageNames = [
          `${baseName}.png`,
          `${baseName}.jpg`,
          `${baseName}.jpeg`,
        ];

        for (const possibleImageName of possibleImageNames) {
          try {
            const fileContents = await fs.readFile(
              path.join(extractPath, possibleImageName),
              "base64",
            );
            images.push(fileContents);
          } catch (_e) {
            // Do nothing
          }
        }

        const recipe = await textToRecipe(
          recipeText,
          TextToRecipeInputType.Document,
        );
        if (!recipe) {
          continue;
        }

        standardizedRecipeImportInput.push({
          ...recipe,
          images,
          labels: userLabels,
        });
      }

      if (standardizedRecipeImportInput.length === 0) {
        throw new Error("No recipes");
      }

      await prisma.job.update({
        where: {
          id: job.id,
        },
        data: {
          progress: 50,
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
        const isBadZipError =
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
              isBadFormat: isBadZipError,
              isNoRecipes: isNoRecipesError,
            }),
          },
        });

        if (!isBadZipError && !isNoRecipesError) {
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
