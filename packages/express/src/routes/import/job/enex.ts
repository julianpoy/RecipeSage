/* eslint-disable @typescript-eslint/no-explicit-any */

import { BadRequestError } from "../../../errors";
import {
  AuthenticationEnforcement,
  defineHandler,
} from "../../../defineHandler";
import multer from "multer";
import fs from "fs/promises";
import { indexRecipes } from "@recipesage/util/server/search";
import { JobStatus, JobType } from "@prisma/client";
import {
  importStandardizedRecipes,
  StandardizedRecipeImportEntry,
} from "@recipesage/util/server/db";
import { JobMeta, prisma } from "@recipesage/prisma";
import Sentry from "@sentry/node";
import { cleanLabelTitle, JOB_RESULT_CODES } from "@recipesage/util/shared";
import xmljs from "xml-js";
import {
  deletePathsSilent,
  getImportJobResultCode,
} from "@recipesage/util/server/general";
import { z } from "zod";
import {
  textToRecipe,
  TextToRecipeInputType,
} from "@recipesage/util/server/ml";

const schema = {
  query: z.object({
    labels: z.string().optional(),
  }),
};

export const enexHandler = defineHandler(
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
          importType: "enex",
          importLabels: userLabels,
        } satisfies JobMeta,
      },
    });

    // We complete this work outside of the scope of the request
    const start = async () => {
      const xml = await fs.readFile(file.path, "utf8");
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

      const grabImageBuffers = (field: any) => {
        if (!field) return [];
        if (field._text) return [Buffer.from(field._text, "base64")];
        if (field.data?._text) return [Buffer.from(field.data._text, "base64")];
        if (Array.isArray(field) && field.length)
          return field
            .map((item) => item._text || item.data?._text)
            .filter((item) => item)
            .map((item) => Buffer.from(item, "base64"));

        return [];
      };

      const recursiveGrabText = (field: any) => {
        let text = field?._text || "";

        if (typeof field === "object" && !Array.isArray(field)) {
          for (const key of Object.keys(field)) {
            if (!(key in field)) continue;
            const childText = recursiveGrabText(field[key]);
            text += `\n${childText}`;
          }
        }
        return text;
      };

      const standardizedRecipeImportInput: StandardizedRecipeImportEntry[] = [];
      for (const enexRecipe of data["en-export"].note) {
        if (!enexRecipe.content._cdata) continue;

        let recipeText = "";
        const cdata = JSON.parse(
          xmljs.xml2json(enexRecipe.content._cdata, {
            compact: true,
            spaces: 4,
          }),
        );
        for (const element of cdata["en-note"].div) {
          recipeText += `\n${recursiveGrabText(element)}`;
        }
        recipeText = recipeText
          .split("\n")
          .filter((el) => el?.trim())
          .join("\n");
        const recipe = await textToRecipe(
          recipeText,
          TextToRecipeInputType.Document,
        );
        if (!recipe) {
          continue;
        }

        recipe.recipe.title = grabFieldText(enexRecipe.title);
        recipe.recipe.folder = "main";
        recipe.labels.push(...grabLabelTitles(enexRecipe.tag), ...userLabels);
        recipe.images.push(...grabImageBuffers(enexRecipe.resource));

        standardizedRecipeImportInput.push(recipe);
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
        const isNoRecipesError =
          e instanceof Error && e.message === "No recipes";

        await prisma.job.update({
          where: {
            id: job.id,
          },
          data: {
            status: JobStatus.FAIL,
            resultCode: getImportJobResultCode({
              isNoRecipes: isNoRecipesError,
            }),
          },
        });

        if (!isNoRecipesError) {
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
