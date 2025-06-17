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
import xmljs from "xml-js";
import { cleanLabelTitle } from "@recipesage/util/shared";
import {
  deletePathsSilent,
  ImportBadFormatError,
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
      importType: "images",
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

      const filename = fileNames.find((filename) => filename.endsWith(".xml"));
      if (!filename) {
        throw new ImportBadFormatError();
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
          labels: [
            ...grabLabelTitles(cookmateRecipe.category),
            ...importLabels,
          ],
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
