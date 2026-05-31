import * as cheerio from "cheerio";
import { cleanLabelTitle } from "@recipesage/util/shared";

export interface ParsedCopymethatRecipe {
  title: string;
  description: string | undefined;
  sourceUrl: string | undefined;
  rating: number | undefined;
  servings: string | undefined;
  ingredients: string;
  instructions: string;
  notes: string | undefined;
  labels: string[];
  imageSrcs: string[];
}

export function parseCopymethatHtml(html: string): ParsedCopymethatRecipe[] {
  const $ = cheerio.load(html);

  return $(".recipe")
    .toArray()
    .map((domItem) => {
      const $item = $(domItem);

      const title = $item.find("#name").text().trim() || "";
      const description = $item.find("#description").text().trim() || undefined;
      const sourceUrl = $item.find("#original_link").attr("href") || undefined;
      const rating =
        parseInt($item.find("#ratingValue").text().trim() || "NaN") ||
        undefined;
      const servings = $item.find("#recipeYield").text().trim() || undefined;

      const ingredients = $item
        .find(".recipeIngredient")
        .map((_, el) => $(el).text().trim())
        .get()
        .join("\n");

      const instructions = $item
        .find(".instruction")
        .map((_, el) => $(el).text().trim())
        .get()
        .join("\n");

      const notes = $item.find("#recipeNotes").text() || undefined;

      const extraInfoLabels = $item
        .find("#extra_info")
        .children()
        .toArray()
        .flatMap((el) => {
          const id = $(el).attr("id");
          return id && id !== "rating" ? [id] : [];
        });

      const categoryLabels = $item
        .find(".recipeCategory")
        .toArray()
        .flatMap((el) => {
          const text = $(el).text().trim();
          return text ? [text] : [];
        });

      const labels = [...extraInfoLabels, ...categoryLabels].map(
        cleanLabelTitle,
      );

      const imageSrcs = [
        ...new Set(
          $item
            .find("img")
            .toArray()
            .flatMap((el) => {
              const src = $(el).attr("src");
              return src ? [src] : [];
            }),
        ),
      ];

      return {
        title,
        description,
        sourceUrl,
        rating,
        servings,
        ingredients,
        instructions,
        notes,
        labels,
        imageSrcs,
      };
    });
}
