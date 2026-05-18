import { z } from "zod";
import { AuthenticationEnforcement, defineHandler } from "../../defineHandler";
import { BadRequestError } from "../../errors";
import {
  ClipFetchError,
  clipHtml,
  clipUrl,
  ClipTimeoutError,
} from "@recipesage/util/server/general";
import {
  isRecipeRecognitionSuccess,
  recordCreditsSpent,
} from "@recipesage/util/server/general";
import { assertCreditsAvailableExpress } from "../../util/assertCreditsAvailableExpress";
import { stripBlankLines } from "@recipesage/util/shared";

const schema = {
  body: z.object({
    url: z.string().optional(),
    html: z.string().optional(),
  }),
};

export const clipPostHandler = defineHandler(
  {
    schema,
    authentication: AuthenticationEnforcement.Required,
  },
  async (req, res) => {
    const userId = res.locals.session.userId;

    const url = (req.body.url || "").trim();
    const html = (req.body.html || "").trim();

    if (url) {
      await assertCreditsAvailableExpress(userId, "clipUrl");

      try {
        const results = await clipUrl(url);

        results.recipe.ingredients = stripBlankLines(
          results.recipe.ingredients || "",
        );
        results.recipe.instructions = stripBlankLines(
          results.recipe.instructions || "",
        );

        if (isRecipeRecognitionSuccess(results.recipe)) {
          await recordCreditsSpent(userId, "clipUrl");
        }

        return {
          statusCode: 200,
          data: results,
        };
      } catch (e) {
        if (e instanceof ClipTimeoutError || e instanceof ClipFetchError) {
          throw new BadRequestError("Failed to reach target site");
        }
        throw e;
      }
    }

    if (html) {
      await assertCreditsAvailableExpress(userId, "clipHtml");

      const results = await clipHtml(html);

      results.recipe.ingredients = stripBlankLines(
        results.recipe.ingredients || "",
      );
      results.recipe.instructions = stripBlankLines(
        results.recipe.instructions || "",
      );

      if (isRecipeRecognitionSuccess(results.recipe)) {
        await recordCreditsSpent(userId, "clipHtml");
      }

      return {
        statusCode: 200,
        data: {
          ...results.recipe,
          imageURL: results.images[0] || "",
        },
      };
    }

    throw new BadRequestError("Must provide 'html' or 'url' in body");
  },
);
