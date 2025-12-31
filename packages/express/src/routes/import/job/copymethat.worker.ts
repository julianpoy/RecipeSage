import * as cheerio from "cheerio";
import { stat } from "fs/promises";
import workerpool from "workerpool";

export interface CopyMeThatResult {
  title: string;
  description: string | undefined;
  url: string | undefined;
  rating: number | undefined;
  servings: string | undefined;
  ingredients: string | undefined;
  instructions: string | undefined;
  notes: string | undefined;
  labels: string[];
  imagePaths: string[];
}

async function extractCopyMeThatFields(htmlStr: string, extractPath: string) {
  const $ = cheerio.load(htmlStr);

  const results: CopyMeThatResult[] = [];
  const domList = $(".recipe").toArray();

  for (const domItem of domList) {
    const $item = $(domItem);

    const title = $item.find("#name").text().trim() || "Untitled";
    const description = $item.find("#description").text().trim() || undefined;
    const sourceUrl = $item.find("#original_link").attr("href");
    const rating =
      parseInt($item.find("#ratingValue").text().trim() || "NaN") || undefined;
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

    const labels = $item
      .find("extra_info")
      .children()
      .map((_, el) => $(el).attr("id"))
      .get()
      .filter(Boolean)
      .filter((el) => el !== "rating");

    const unconfirmedImagePaths = [
      ...new Set(
        $item
          .find("img")
          .map((_, el) => $(el).attr("src"))
          .get()
          .filter(Boolean),
      ),
    ].map((src) => extractPath + "/" + src);

    const imagePaths: string[] = [];
    for (const imagePath of unconfirmedImagePaths) {
      try {
        await stat(imagePath);
        imagePaths.push(imagePath);
      } catch (_e) {
        console.log(_e);
        // Do nothing, image excluded
      }
    }

    results.push({
      title,
      description,
      url: sourceUrl,
      rating,
      servings,
      ingredients,
      instructions,
      notes,
      labels,
      imagePaths,
    });
  }

  return results;
}

workerpool.worker({
  extractCopyMeThatFields,
});
