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

      const dom = new jsdom.JSDOM(recipeHtml);

      const standardizedRecipeImportInput: StandardizedRecipeImportEntry[] = [];
      const domList = dom.window.document.getElementsByClassName("recipe");
      for (const domItem of domList) {
        const title =
          domItem.querySelector("#name")?.textContent?.trim() || "Untitled";
        const description = domItem
          .querySelector("#description")
          ?.textContent?.trim();
        const sourceUrl = (
          domItem.querySelector("#original_link") as HTMLLinkElement | null
        )?.href;
        const rating =
          parseInt(
            domItem.querySelector("#ratingValue")?.textContent.trim() || "NaN",
          ) || undefined;
        const servings = domItem
          .querySelector("#recipeYield")
          ?.textContent?.trim();

        const ingredients = Array.from(
          domItem.querySelectorAll(".recipeIngredient"),
        )
          .map((ingredient) => ingredient.textContent.trim())
          .join("\n");

        const instructions = Array.from(
          domItem.querySelectorAll(".instruction"),
        )
          .map((instruction) => instruction.textContent.trim())
          .join("\n");

        const notes =
          domItem.querySelector("#recipeNotes")?.textContent || undefined;

        const labels = [
          ...(domItem.querySelector("extra_info")?.children || []),
        ]
          .map((el) => el?.id)
          .filter(Boolean)
          .filter((el) => el !== "rating")
          .map(cleanLabelTitle);

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
            description,
            ingredients,
            instructions,
            yield: servings,
            notes,
            url: sourceUrl,
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
