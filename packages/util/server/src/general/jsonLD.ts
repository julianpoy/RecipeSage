import { RecipeSummary } from "@recipesage/prisma";
import { parseIngredients, parseInstructions } from "@recipesage/util/shared";
import { convertFromISO8601Time } from "./convertToISO8601Time";
import { convertToISO8601Time } from "./convertFromISO8601Time";
import { StandardizedRecipeImportEntry } from "../db";

type JsonLDImages =
  | string
  | (
      | {
          url: string;
        }
      | string
    )[];

export type JsonLD = {
  "@context": string;
  "@type": "Recipe" | string;
  identifier?: string;
  name?: string;
  datePublished?: string;
  description?: string;
  recipeYield?: string | string[];
  prepTime?: string | string[];
  totalTime?: string | string[];
  recipeInstructions?:
    | string
    | (
        | string
        | {
            text?: string;
          }
      )[];
  recipeIngredient?:
    | string
    | (
        | string
        | {
            text?: string;
          }
      )[];
  recipeCategory?: string | string[];
  comment?:
    | string
    | (
        | string
        | {
            "@type": string;
            name?: string;
            text?: string;
          }
      )[];
  aggregateRating?:
    | string
    | {
        "@type": string;
        ratingValue?: string;
        bestRating?: string;
      };
  creditText?: string;
  isBasedOn?: string;
  images?: JsonLDImages;
  image?: JsonLDImages;
};

export const recipeToJSONLD = (recipe: RecipeSummary) =>
  ({
    "@context": "http://schema.org",
    "@type": "Recipe",
    identifier: recipe.id,
    datePublished: new Date(recipe.createdAt).toISOString(),
    description: recipe.description,
    image: (recipe.recipeImages || []).map(
      (recipeImage) => recipeImage.image.location,
    ),
    name: recipe.title,
    prepTime: convertToISO8601Time(recipe.activeTime) || recipe.activeTime,
    recipeIngredient: parseIngredients(recipe.ingredients, 1, false).map(
      (el) => (el.isHeader ? `[${el.content}]` : el.content),
    ),
    recipeInstructions: parseInstructions(recipe.instructions, 1, false).map(
      (el) => ({
        "@type": el.isHeader ? "HowToSection" : "HowToStep",
        text: el.isHeader ? `[${el.content}]` : el.content,
      }),
    ),
    recipeYield: recipe.yield,
    totalTime: convertToISO8601Time(recipe.totalTime) || recipe.totalTime,
    recipeCategory: (recipe.recipeLabels || []).map(
      (recipeLabel) => recipeLabel.label.title,
    ),
    creditText: recipe.source,
    isBasedOn: recipe.url,
    comment: [
      {
        "@type": "Comment",
        name: "Author Notes",
        text: recipe.notes,
      },
    ],
    aggregateRating: recipe.rating
      ? {
          "@type": "AggregateRating",
          ratingValue: `${recipe.rating}`,
          bestRating: "5",
        }
      : undefined,
  }) satisfies JsonLD;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getImageSrcFromSchema = (jsonLD: JsonLD): string | Buffer => {
  const images = jsonLD.images || jsonLD.image;
  if (!images) return "";

  let imageSrc: string | undefined;
  if (typeof images === "string") imageSrc = images;
  else if ("url" in images && images.url === "string") imageSrc = images.url;
  else if (Array.isArray(images) && typeof images[0] === "string")
    [imageSrc] = images[0] as string;
  else if (
    Array.isArray(images) &&
    typeof images[0] === "object" &&
    typeof images[0]?.url === "string"
  )
    imageSrc = images[0].url;

  if (imageSrc) {
    try {
      const url = new URL(imageSrc);

      if (url.protocol === "http:" || url.protocol === "https:")
        return imageSrc;
      if (
        url.protocol === "data:" &&
        url.href.startsWith("data:image/png;base64,")
      ) {
        return Buffer.from(
          url.href.replace("data:image/png;base64,", ""),
          "base64",
        );
      }
    } catch (_) {
      // Do nothing
    }
  }

  return "";
};

const getLongestString = (strings: string[]) =>
  strings.reduce((acc, el) => (el.length > acc.length ? el : acc), "");

const getImageSRCsFromSchema = (jsonLD: JsonLD): (string | Buffer)[] => {
  const images = jsonLD.images || jsonLD.image;
  if (!images) return [];

  let imageSRCs: string[] = [];
  if (typeof images === "string") imageSRCs = [images];
  else if ("url" in images && typeof images.url === "string")
    imageSRCs = [images.url];
  else if (Array.isArray(images)) {
    for (const image of images) {
      if (typeof image === "object" && typeof image.url === "string") {
        imageSRCs.push(image.url);
      } else if (typeof image === "string") {
        imageSRCs.push(image);
      }
    }
  }

  return imageSRCs
    .map((src: string) => {
      try {
        const url = new URL(src);

        if (url.protocol === "http:" || url.protocol === "https:") return src;
        if (
          url.protocol === "data:" &&
          url.href.startsWith("data:image/png;base64,")
        ) {
          return Buffer.from(
            url.href.replace("data:image/png;base64,", ""),
            "base64",
          );
        }
      } catch (_) {
        // Do nothing
      }

      return null;
    })
    .filter((src): src is Buffer<ArrayBuffer> | string => !!src);
};

const getTitleFromSchema = (jsonLD: JsonLD) => {
  const title = jsonLD.name;

  if (typeof title === "string") return title;

  return "";
};

const getDescriptionFromSchema = (jsonLD: JsonLD) => {
  const { description } = jsonLD;

  if (typeof description === "string") return description;

  return "";
};

const getYieldFromSchema = (jsonLD: JsonLD) => {
  const { recipeYield } = jsonLD;
  if (!recipeYield) return "";

  if (typeof recipeYield === "string") return recipeYield;
  if (Array.isArray(recipeYield) && typeof recipeYield[0] === "string") {
    return getLongestString(recipeYield);
  }

  return "";
};

const getActiveTimeFromSchema = (jsonLD: JsonLD) => {
  const { prepTime } = jsonLD;
  if (!prepTime) return "";

  if (typeof prepTime === "string") {
    return convertFromISO8601Time(prepTime);
  }
  if (Array.isArray(prepTime) && prepTime[0] === "string") {
    return convertFromISO8601Time(getLongestString(prepTime));
  }

  return "";
};

const getTotalTimeFromSchema = (jsonLD: JsonLD) => {
  const { totalTime } = jsonLD;
  if (!totalTime) return "";

  if (typeof totalTime === "string") {
    return convertFromISO8601Time(totalTime);
  }
  if (Array.isArray(totalTime) && totalTime[0] === "string") {
    return convertFromISO8601Time(getLongestString(totalTime));
  }

  return "";
};

const getInstructionsFromSchema = (jsonLD: JsonLD) => {
  const instructions = jsonLD.recipeInstructions;
  if (!instructions) return "";

  if (typeof instructions === "string") return instructions;
  if (Array.isArray(instructions)) {
    const acc: string[] = [];
    for (const instruction of instructions) {
      if (typeof instruction === "string") acc.push(instruction);
      else acc.push(instruction.text || "");
    }

    return acc.join("\n");
  }

  return "";
};

const getIngredientsFromSchema = (jsonLD: JsonLD) => {
  const ingredients = jsonLD.recipeIngredient;
  if (!ingredients) return "";

  if (typeof ingredients === "string") return ingredients;
  if (Array.isArray(ingredients)) {
    const acc: string[] = [];
    for (const ingredient of ingredients) {
      if (typeof ingredient === "string") acc.push(ingredient);
      else acc.push(ingredient.text || "");
    }

    return acc.join("\n");
  }

  return "";
};

const getLabelsFromSchema = (jsonLD: JsonLD) => {
  const { recipeCategory } = jsonLD;
  if (!recipeCategory) return [];

  if (typeof recipeCategory === "string")
    return recipeCategory.split(",").map((el) => el.trim());
  if (typeof recipeCategory[0] === "string")
    return recipeCategory.map((el) => el.trim());

  return [];
};

const getAuthorNotesCommentFromSchema = (jsonLD: JsonLD) => {
  if (!jsonLD.comment || !jsonLD.comment[0]) return;

  if (Array.isArray(jsonLD.comment)) {
    for (const comment of jsonLD.comment) {
      if (typeof comment === "object" && comment.name === "Author Notes") {
        return comment.text || "";
      }
    }
  }
};

const getAggregateRatingFromSchema = (jsonLD: JsonLD) => {
  if (!jsonLD.aggregateRating) return;

  if (
    typeof jsonLD.aggregateRating === "object" &&
    jsonLD.aggregateRating.ratingValue
  ) {
    const ratingValue = parseInt(jsonLD.aggregateRating.ratingValue);
    return isNaN(ratingValue) || ratingValue > 5 || ratingValue < 1
      ? undefined
      : ratingValue;
  }
};

export const jsonLDToStandardizedRecipeImportEntry = (
  jsonLD: JsonLD,
): StandardizedRecipeImportEntry => ({
  recipe: {
    title: getTitleFromSchema(jsonLD),
    description: getDescriptionFromSchema(jsonLD),
    yield: getYieldFromSchema(jsonLD),
    activeTime: getActiveTimeFromSchema(jsonLD),
    totalTime: getTotalTimeFromSchema(jsonLD),
    source: jsonLD.creditText || "",
    url: jsonLD.isBasedOn || "",
    notes: getAuthorNotesCommentFromSchema(jsonLD) || "",
    ingredients: getIngredientsFromSchema(jsonLD),
    instructions: getInstructionsFromSchema(jsonLD),
    rating: getAggregateRatingFromSchema(jsonLD),
    folder: "main",
  },
  labels: getLabelsFromSchema(jsonLD),
  images: getImageSRCsFromSchema(jsonLD),
});
