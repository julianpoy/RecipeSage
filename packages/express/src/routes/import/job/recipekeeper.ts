import { BadRequestError } from "../../../errors";
import {
  AuthenticationEnforcement,
  defineHandler,
} from "../../../defineHandler";
import multer from "multer";
import fs from "fs/promises";
import extract from "extract-zip";
import { StandardizedRecipeImportEntry } from "@recipesage/util/server/db";
import jsdom from "jsdom";
import { cleanLabelTitle } from "@recipesage/util/shared";
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
      importType: "recipekeeper",
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
          } catch (_e) {
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

          labels: [...labels, ...importLabels],
          images: imagePaths,
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
