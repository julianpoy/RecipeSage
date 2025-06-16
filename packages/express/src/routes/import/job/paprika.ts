/* eslint-disable @typescript-eslint/no-explicit-any */

import { BadRequestError } from "../../../errors";
import {
  AuthenticationEnforcement,
  defineHandler,
} from "../../../defineHandler";
import multer from "multer";
import fs from "fs/promises";
import extract from "extract-zip";
import { StandardizedRecipeImportEntry } from "@recipesage/util/server/db";
import { cleanLabelTitle } from "@recipesage/util/shared";
import path from "path";
import { gunzipPromise } from "@recipesage/util/server/storage";
import {
  deletePathsSilent,
  importJobFailCommon,
  importJobFinishCommon,
  importJobSetupCommon,
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
      importType: "paprika",
      labels: req.query.labels?.split(",") || [],
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

          labels: [...labels, ...importLabels],
          images,
        });
      }

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
