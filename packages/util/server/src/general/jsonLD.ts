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

export type NutritionInformation = {
  "@type"?: "NutritionInformation";
  servingSize?: string;
  calories?: string;
  fatContent?: string;
  saturatedFatContent?: string;
  transFatContent?: string;
  unsaturatedFatContent?: string;
  cholesterolContent?: string;
  sodiumContent?: string;
  carbohydrateContent?: string;
  fiberContent?: string;
  sugarContent?: string;
  proteinContent?: string;
  description?: string;
};

export type JsonLD = {
  "@context": string;
  "@type": "Recipe" | string;
  identifier?: string;
  name?: string;
  inLanguage?: string;
  datePublished?: string;
  description?: string;
  recipeYield?: string | string[];
  prepTime?: string | string[];
  cookTime?: string | string[];
  totalTime?: string | string[];
  recipeInstructions?:
    | string
    | (
        | string
        | {
            "@type"?: string;
            name?: string;
            text?: string;
            itemListElement?:
              | string
              | (
                  | string
                  | {
                      text?: string;
                      name?: string;
                    }
                )[];
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
  author?:
    | string
    | {
        name?: string;
      }
    | (
        | string
        | {
            name?: string;
          }
      )[];
  isBasedOn?: string;
  images?: JsonLDImages;
  image?: JsonLDImages;
  nutrition?: string | NutritionInformation | NutritionInformation[];
};

const parseSchemaOrgNumber = (
  value: string | undefined,
): number | undefined => {
  if (!value) return undefined;
  const match = value.match(/-?\d+(?:\.\d+)?/);
  if (!match) return undefined;
  const parsed = parseFloat(match[0]);
  return isNaN(parsed) ? undefined : parsed;
};

const formatGrams = (value: number) => `${value} g`;
const formatMilligrams = (value: number) => `${value} mg`;
const formatMicrograms = (value: number) => `${value} mcg`;
const formatCalories = (value: number) => `${value} kcal`;

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
    recipeIngredient: parseIngredients(recipe.ingredients, "1").map((el) =>
      el.isHeader ? `[${el.content}]` : el.content,
    ),
    recipeInstructions: parseInstructions(recipe.instructions, "1").map(
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
    nutrition: getNutritionForExport(recipe),
  }) satisfies JsonLD;

const getNutritionForExport = (
  recipe: RecipeSummary,
): NutritionInformation | undefined => {
  const unsaturatedFat =
    (recipe.nutritionPolyunsaturatedFat ?? 0) +
    (recipe.nutritionMonounsaturatedFat ?? 0);
  const hasUnsaturated =
    recipe.nutritionPolyunsaturatedFat != null ||
    recipe.nutritionMonounsaturatedFat != null;

  const extraDetails: string[] = [];
  if (recipe.nutritionAddedSugars != null) {
    extraDetails.push(
      `Added sugars: ${formatGrams(recipe.nutritionAddedSugars)}`,
    );
  }
  if (recipe.nutritionVitaminD != null) {
    extraDetails.push(
      `Vitamin D: ${formatMicrograms(recipe.nutritionVitaminD)}`,
    );
  }
  if (recipe.nutritionCalcium != null) {
    extraDetails.push(`Calcium: ${formatMilligrams(recipe.nutritionCalcium)}`);
  }
  if (recipe.nutritionIron != null) {
    extraDetails.push(`Iron: ${formatMilligrams(recipe.nutritionIron)}`);
  }
  if (recipe.nutritionPotassium != null) {
    extraDetails.push(
      `Potassium: ${formatMilligrams(recipe.nutritionPotassium)}`,
    );
  }

  const descriptionParts: string[] = [];
  if (extraDetails.length) descriptionParts.push(extraDetails.join("; "));
  if (recipe.nutritionOtherDetails) {
    descriptionParts.push(recipe.nutritionOtherDetails);
  }
  const description = descriptionParts.length
    ? descriptionParts.join("\n")
    : undefined;

  const nutrition: NutritionInformation = {
    "@type": "NutritionInformation",
    servingSize: recipe.nutritionServingSize ?? undefined,
    calories:
      recipe.nutritionCalories != null
        ? formatCalories(recipe.nutritionCalories)
        : undefined,
    fatContent:
      recipe.nutritionTotalFat != null
        ? formatGrams(recipe.nutritionTotalFat)
        : undefined,
    saturatedFatContent:
      recipe.nutritionSaturatedFat != null
        ? formatGrams(recipe.nutritionSaturatedFat)
        : undefined,
    transFatContent:
      recipe.nutritionTransFat != null
        ? formatGrams(recipe.nutritionTransFat)
        : undefined,
    unsaturatedFatContent: hasUnsaturated
      ? formatGrams(unsaturatedFat)
      : undefined,
    cholesterolContent:
      recipe.nutritionCholesterol != null
        ? formatMilligrams(recipe.nutritionCholesterol)
        : undefined,
    sodiumContent:
      recipe.nutritionSodium != null
        ? formatMilligrams(recipe.nutritionSodium)
        : undefined,
    carbohydrateContent:
      recipe.nutritionTotalCarbs != null
        ? formatGrams(recipe.nutritionTotalCarbs)
        : undefined,
    fiberContent:
      recipe.nutritionDietaryFiber != null
        ? formatGrams(recipe.nutritionDietaryFiber)
        : undefined,
    sugarContent:
      recipe.nutritionTotalSugars != null
        ? formatGrams(recipe.nutritionTotalSugars)
        : undefined,
    proteinContent:
      recipe.nutritionProtein != null
        ? formatGrams(recipe.nutritionProtein)
        : undefined,
    description,
  };

  const hasAnyValue = Object.entries(nutrition).some(
    ([key, value]) => key !== "@type" && value !== undefined,
  );
  return hasAnyValue ? nutrition : undefined;
};

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
    return convertFromISO8601Time(prepTime, jsonLD.inLanguage);
  }
  if (Array.isArray(prepTime) && typeof prepTime[0] === "string") {
    return convertFromISO8601Time(
      getLongestString(prepTime),
      jsonLD.inLanguage,
    );
  }

  return "";
};

const getTotalTimeFromSchema = (jsonLD: JsonLD) => {
  const totalTime = jsonLD.totalTime || jsonLD.cookTime;
  if (!totalTime) return "";

  if (typeof totalTime === "string") {
    return convertFromISO8601Time(totalTime, jsonLD.inLanguage);
  }
  if (Array.isArray(totalTime) && typeof totalTime[0] === "string") {
    return convertFromISO8601Time(
      getLongestString(totalTime),
      jsonLD.inLanguage,
    );
  }

  return "";
};

const getInstructionsFromSchema = (jsonLD: JsonLD) => {
  const instructions = jsonLD.recipeInstructions;
  if (!instructions) return "";

  if (typeof instructions === "string") return instructions;
  if (!Array.isArray(instructions)) return "";

  const acc: string[] = [];
  for (const instruction of instructions) {
    if (typeof instruction === "string") {
      acc.push(instruction);
    } else if (instruction["@type"] === "HowToSection") {
      if (instruction.name) acc.push(`[${instruction.name}]`);

      const steps = instruction.itemListElement;
      if (typeof steps === "string") {
        acc.push(steps);
      } else if (Array.isArray(steps)) {
        for (const step of steps) {
          if (typeof step === "string") acc.push(step);
          else acc.push(step.text || "");
        }
      }
    } else {
      acc.push(instruction.text || "");
    }
  }

  return acc.join("\n");
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

const getAuthorFromSchema = (jsonLD: JsonLD) => {
  const { author } = jsonLD;
  if (!author) return "";

  if (typeof author === "string") return author;
  if (Array.isArray(author)) {
    const first = author[0];
    if (typeof first === "string") return first;
    if (first && typeof first.name === "string") return first.name;
    return "";
  }
  if (typeof author.name === "string") return author.name;

  return "";
};

const getNutritionFromSchema = (jsonLD: JsonLD) => {
  const nutrition = Array.isArray(jsonLD.nutrition)
    ? jsonLD.nutrition[0]
    : jsonLD.nutrition;
  if (!nutrition || typeof nutrition === "string") return {};

  const unsaturatedFat = parseSchemaOrgNumber(nutrition.unsaturatedFatContent);
  const descriptionParts: string[] = [];
  if (nutrition.description) descriptionParts.push(nutrition.description);
  if (unsaturatedFat !== undefined) {
    descriptionParts.push(
      `Unsaturated fat: ${nutrition.unsaturatedFatContent}`,
    );
  }
  const otherDetails = descriptionParts.length
    ? descriptionParts.join("\n")
    : undefined;

  return {
    nutritionServingSize: nutrition.servingSize ?? undefined,
    nutritionCalories: parseSchemaOrgNumber(nutrition.calories),
    nutritionTotalFat: parseSchemaOrgNumber(nutrition.fatContent),
    nutritionSaturatedFat: parseSchemaOrgNumber(nutrition.saturatedFatContent),
    nutritionTransFat: parseSchemaOrgNumber(nutrition.transFatContent),
    nutritionCholesterol: parseSchemaOrgNumber(nutrition.cholesterolContent),
    nutritionSodium: parseSchemaOrgNumber(nutrition.sodiumContent),
    nutritionTotalCarbs: parseSchemaOrgNumber(nutrition.carbohydrateContent),
    nutritionDietaryFiber: parseSchemaOrgNumber(nutrition.fiberContent),
    nutritionTotalSugars: parseSchemaOrgNumber(nutrition.sugarContent),
    nutritionProtein: parseSchemaOrgNumber(nutrition.proteinContent),
    nutritionOtherDetails: otherDetails,
  };
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
    source: jsonLD.creditText || getAuthorFromSchema(jsonLD),
    url: jsonLD.isBasedOn || "",
    notes: getAuthorNotesCommentFromSchema(jsonLD) || "",
    ingredients: getIngredientsFromSchema(jsonLD),
    instructions: getInstructionsFromSchema(jsonLD),
    rating: getAggregateRatingFromSchema(jsonLD),
    folder: "main",
    ...getNutritionFromSchema(jsonLD),
  },
  labels: getLabelsFromSchema(jsonLD),
  images: getImageSRCsFromSchema(jsonLD),
});
