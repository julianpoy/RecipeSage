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
import * as jsdom from "jsdom";
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

export const recipekeeperHandler = defineHandler(
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
          importType: "recipekeeper",
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

      const recipeHtml = await fs.readFile(
        extractPath + "/recipes.html",
        "utf-8",
      );

      const dom = new jsdom.JSDOM(recipeHtml);

      const standardizedRecipeImportInput: StandardizedRecipeImportEntry[] = [];
      const domList =
        dom.window.document.getElementsByClassName("recipe-details");
      for (const domItem of domList) {
        const title =
          domItem.querySelector('[itemprop="name"]')?.textContent?.trim() ||
          "Untitled";
        const source = domItem
          .querySelector('[itemprop="recipeSource"]')
          ?.textContent?.trim();
        const rating =
          parseInt(
            domItem
              .querySelector('[itemprop="recipeRating"]')
              ?.getAttribute("content")
              ?.trim() || "NaN",
          ) || undefined;
        const servings = domItem
          .querySelector('[itemprop="recipeYield"]')
          ?.textContent?.trim();
        const activeTime = domItem
          .querySelector('[itemprop="prepTime"]')
          ?.textContent?.trim();
        let totalTime = domItem
          .querySelector('[itemprop="cookTime"]')
          ?.textContent?.trim();
        if (totalTime?.trim()) {
          // Recipe keeper does not track total time, just active and cook. We simulate that here.
          totalTime += " Cook Time";
        }
        const ingredients = domItem
          .querySelector('[itemprop="recipeIngredients"]')
          ?.textContent?.split("\n")
          .map((ingredient) => ingredient.trim())
          .join("\n");

        const instructions = domItem
          .querySelector('[itemprop="recipeDirections"]')
          ?.textContent?.trim()
          .split("\n")
          .map((instruction) =>
            instruction
              .trim()
              .replaceAll(/^\d+. /g, "")
              .trim(),
          )
          .join("\n");

        const categories = [
          ...domItem.querySelectorAll('[itemprop="recipeCategory"]'),
        ].map((el) => el.getAttribute("content"));
        const courses = [
          ...domItem.querySelectorAll('[itemprop="recipeCourse"]'),
        ].map((el) => el.textContent);
        const isFavorite =
          domItem
            .querySelector('[itemprop="recipeIsFavourite"]')
            ?.getAttribute("content") === "True";
        const labels = [...categories, ...courses, isFavorite ? `favorite` : ""]
          .filter((e): e is string => !!e)
          .map((e) => cleanLabelTitle(e))
          .filter((e) => e);

        const notes =
          domItem.querySelector('[itemprop="recipeNotes"]')?.textContent ||
          undefined;

        const unconfirmedImagePaths = [
          ...new Set(
            [...domItem.getElementsByTagName("img")].map((el) => el.src),
          ),
        ].map((src) => extractPath + "/" + src);

        const imagePaths = [];
        for (const imagePath of unconfirmedImagePaths) {
          try {
            await fs.stat(imagePath);
            imagePaths.push(imagePath);
          } catch (e) {
            // Do nothing, image excluded
          }
        }

        standardizedRecipeImportInput.push({
          recipe: {
            title,
            ingredients,
            instructions,
            yield: servings,
            totalTime,
            activeTime,
            notes,
            source,
            folder: "main",
            rating,
          },

          labels: [...labels, ...userLabels],
          images: imagePaths,
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
