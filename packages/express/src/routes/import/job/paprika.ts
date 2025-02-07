/* eslint-disable @typescript-eslint/no-explicit-any */

import { BadRequestError } from "../../../errors";
import {
  AuthenticationEnforcement,
  defineHandler,
} from "../../../defineHandler";
import * as multer from "multer";
import * as fs from "fs/promises";
import * as extract from "extract-zip";
import { indexRecipes } from "@recipesage/util/server/search";
import { JobStatus, JobType } from "@prisma/client";
import {
  importStandardizedRecipes,
  StandardizedRecipeImportEntry,
} from "@recipesage/util/server/db";
import { JobMeta, prisma } from "@recipesage/prisma";
import * as Sentry from "@sentry/node";
import { cleanLabelTitle, JOB_RESULT_CODES } from "@recipesage/util/shared";
import * as path from "path";
import { gunzipPromise } from "@recipesage/util/server/storage";
import {
  deletePathsSilent,
  getImportJobResultCode,
} from "@recipesage/util/server/general";
import { z } from "zod";

const schema = {
  query: z.object({
    labels: z.string().optional(),
  }),
};

export const paprikaHandler = defineHandler(
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
          importType: "paprika",
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

        const fileBuf = await fs.readFile(filePath);
        const fileContents = await gunzipPromise(fileBuf);

        const recipeData = JSON.parse(fileContents.toString());

        const notes = [
          recipeData.notes,
          recipeData.nutritional_info
            ? `Nutritional Info: ${recipeData.difficulty}`
            : "",
          recipeData.difficulty ? `Difficulty: ${recipeData.difficulty}` : "",
          recipeData.rating ? `Rating: ${recipeData.rating}` : "",
        ]
          .filter((e) => e && e.length > 0)
          .join("\n");

        const totalTime = [
          recipeData.total_time,
          recipeData.cook_time ? `(${recipeData.cook_time} cooking time)` : "",
        ]
          .filter((e) => e)
          .join(" ");

        const labels = (recipeData.categories || [])
          .map((e: any) => cleanLabelTitle(e))
          .filter((e: any) => e);

        // Supports only the first image at the moment
        const images = recipeData.photo_data
          ? [Buffer.from(recipeData.photo_data, "base64")]
          : [];

        standardizedRecipeImportInput.push({
          recipe: {
            title: recipeData.name,
            description: recipeData.description,
            ingredients: recipeData.ingredients,
            instructions: recipeData.directions,
            yield: recipeData.servings,
            totalTime,
            activeTime: recipeData.prep_time,
            notes,
            source: recipeData.source,
            folder: "main",
            url: recipeData.source_url,
          },

          labels: [...labels, ...userLabels],
          images,
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
