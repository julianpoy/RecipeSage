import {
  AuthenticationEnforcement,
  defineHandler,
} from "../../../defineHandler";
import multer from "multer";
import fs from "fs/promises";
import extract from "extract-zip";
import path from "path";
import { StandardizedRecipeImportEntry } from "@recipesage/util/server/db";
import {
  textToRecipe,
  TextToRecipeInputType,
} from "@recipesage/util/server/ml";
import {
  deletePathsSilent,
  importJobFailCommon,
  importJobFinishCommon,
  importJobSetupCommon,
} from "@recipesage/util/server/general";
import { z } from "zod";
import { BadRequestError } from "../../../errors";

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
      importType: "textFiles",
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
          labels: importLabels,
        });
      }

      await importJobFinishCommon({
        timer,
        job,
        userId,
        standardizedRecipeImportInput,
        importTempDirectory: extractPath,
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
