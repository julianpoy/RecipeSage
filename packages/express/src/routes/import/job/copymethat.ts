import { BadRequestError } from "../../../errors";
import {
  AuthenticationEnforcement,
  defineHandler,
} from "../../../defineHandler";
import { join } from "path";
import multer from "multer";
import fs from "fs/promises";
import extract from "extract-zip";
import { StandardizedRecipeImportEntry } from "@recipesage/util/server/db";
import { cleanLabelTitle } from "@recipesage/util/shared";
import {
  deletePathsSilent,
  importJobFailCommon,
  importJobFinishCommon,
  importJobSetupCommon,
} from "@recipesage/util/server/general";
import { z } from "zod";
import workerpool from "workerpool";
import type { CopyMeThatResult } from "./copymethat.worker.ts";

const pool = workerpool.pool(join(__dirname, "./copymethat.worker.ts"), {
  workerType: "thread",
  workerThreadOpts: {
    execArgv: [
      "--experimental-strip-types",
      "--disable-warning=ExperimentalWarning",
    ],
  },
});

const schema = {
  query: z.object({
    labels: z.string().optional(),
  }),
};

export const copymethatHandler = defineHandler(
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
      importType: "copymethat",
      labels: req.query.labels?.split(",") || [],
    });

    // We complete this work outside of the scope of the request
    const start = async () => {
      const zipPath = file.path;
      cleanupPaths.push(zipPath);
      const extractPath = zipPath + "-extract";
      cleanupPaths.push(extractPath);

      await extract(zipPath, { dir: extractPath });

      const recipeHtml = await fs.readFile(
        extractPath + "/recipes.html",
        "utf-8",
      );

      const result = (await pool.exec("extractCopyMeThatFields", [
        recipeHtml,
        extractPath,
      ])) as CopyMeThatResult[];

      const standardizedRecipeImportInput: StandardizedRecipeImportEntry[] = [];
      for (const entry of result) {
        standardizedRecipeImportInput.push({
          recipe: {
            title: entry.title,
            description: entry.description,
            ingredients: entry.ingredients,
            instructions: entry.instructions,
            yield: entry.servings,
            notes: entry.notes,
            url: entry.url,
            folder: "main",
            rating: entry.rating,
          },

          labels: [...entry.labels.map(cleanLabelTitle), ...importLabels],
          images: entry.imagePaths,
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
