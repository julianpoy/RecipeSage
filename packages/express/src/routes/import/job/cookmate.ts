/* eslint-disable @typescript-eslint/no-explicit-any */

import { BadRequestError } from "../../../errors";
import {
  AuthenticationEnforcement,
  defineHandler,
} from "../../../defineHandler";
import multer from "multer";
import fs from "fs/promises";
import extract from "extract-zip";
import { indexRecipes } from "@recipesage/util/server/search";
import { JobStatus, JobType } from "@prisma/client";
import {
  importStandardizedRecipes,
  StandardizedRecipeImportEntry,
} from "@recipesage/util/server/db";
import { JobMeta, prisma } from "@recipesage/prisma";
import Sentry from "@sentry/node";
import xmljs from "xml-js";
import { cleanLabelTitle, JOB_RESULT_CODES } from "@recipesage/util/shared";
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

export const cookmateHandler = defineHandler(
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
          importType: "cookmate",
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

      const filename = fileNames.find((filename) => filename.endsWith(".xml"));
      if (!filename) {
        throw new BadRequestError("Bad cookmate file format");
      }

      const xml = await fs.readFile(extractPath + "/" + filename, "utf8");
      const data = JSON.parse(
        xmljs.xml2json(xml, { compact: true, spaces: 4 }),
      );

      const grabFieldText = (field: any) => {
        if (!field) return "";
        if (field.li && Array.isArray(field.li)) {
          return field.li.map((item: any) => item._text).join("\n");
        }

        return field._text || "";
      };

      const grabLabelTitles = (field: any) => {
        if (!field) return [];
        if (field._text) return [cleanLabelTitle(field._text)];
        if (Array.isArray(field) && field.length)
          return field.map((item) => cleanLabelTitle(item._text));

        return [];
      };

      const grabImagePaths = async (basePath: string, field: any) => {
        if (!field) return [];

        let originalPaths;
        if (field.path?._text || field._text)
          originalPaths = [field.path?._text || field._text];
        if (Array.isArray(field) && field.length)
          originalPaths = field.map((item) => item.path?._text || item._text);

        if (!originalPaths) return [];

        const paths = originalPaths
          .filter((e) => e)
          .map((originalPath) => originalPath.split("/").at(-1))
          .map((trimmedPath) => basePath + "/" + trimmedPath);

        const pathsOnDisk = [];
        for (const path of paths) {
          try {
            await fs.stat(path);
            pathsOnDisk.push(path);
          } catch (_e) {
            // Do nothing, image does not exist in backup
          }
        }

        return pathsOnDisk;
      };

      const standardizedRecipeImportInput: StandardizedRecipeImportEntry[] = [];
      for (const cookmateRecipe of data.cookbook.recipe) {
        standardizedRecipeImportInput.push({
          recipe: {
            title: grabFieldText(cookmateRecipe.title),
            description: grabFieldText(cookmateRecipe.description),
            ingredients: grabFieldText(cookmateRecipe.ingredient),
            instructions: grabFieldText(cookmateRecipe.recipetext),
            yield: grabFieldText(cookmateRecipe.quantity),
            totalTime: grabFieldText(cookmateRecipe.totaltime),
            activeTime: grabFieldText(cookmateRecipe.preptime),
            notes: grabFieldText(cookmateRecipe.comments),
            source: grabFieldText(cookmateRecipe.source),
            folder: "main",
            url: grabFieldText(cookmateRecipe.url),
          },
          labels: [...grabLabelTitles(cookmateRecipe.category), ...userLabels],
          images: [
            ...(await grabImagePaths(
              extractPath + "/images",
              cookmateRecipe.imagepath,
            )),
            ...(await grabImagePaths(
              extractPath + "/images",
              cookmateRecipe.image,
            )),
          ],
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
        extractPath,
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
          e instanceof BadRequestError &&
          e.message === "Bad cookmate file format";

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
