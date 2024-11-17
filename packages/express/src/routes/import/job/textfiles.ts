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
import { prisma } from "@recipesage/prisma";
import * as Sentry from "@sentry/node";
import { deletePathsSilent } from "@recipesage/util/server/general";
import { JOB_RESULT_CODES } from "@recipesage/util/shared";

const schema = {};

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
          } catch (e) {
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
        });
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

        await prisma.job.update({
          where: {
            id: job.id,
          },
          data: {
            status: JobStatus.FAIL,
            resultCode: isBadZipError
              ? JOB_RESULT_CODES.badFile
              : JOB_RESULT_CODES.unknown,
          },
        });

        if (!isBadZipError) {
          Sentry.captureException(e);
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
