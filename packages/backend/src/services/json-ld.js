import * as SharedUtils from "@recipesage/util";

export const recipeToJSONLD = (recipe) => ({
  "@context": "http://schema.org",
  "@type": "Recipe",
  identifier: recipe.id,
  datePublished: new Date(recipe.createdAt).toISOString(),
  description: recipe.description,
  image: (recipe.images || []).map((image) => image.location),
  name: recipe.title,
  prepTime: convertToISO8601Time(recipe.activeTime) || recipe.activeTime,
  recipeIngredient: SharedUtils.parseIngredients(
    recipe.ingredients,
    1,
    false,
  ).map((el) => (el.isHeader ? `[${el.content}]` : el.content)),
  recipeInstructions: SharedUtils.parseInstructions(recipe.instructions).map(
    (el) => ({
      "@type": el.isHeader ? "HowToSection" : "HowToStep",
      text: el.isHeader ? `[${el.content}]` : el.content,
    }),
  ),
  recipeYield: recipe.yield,
  totalTime: convertToISO8601Time(recipe.totalTime) || recipe.totalTime,
  recipeCategory: (recipe.labels || []).map((label) => label.title),
  creditText: recipe.source,
  isBasedOn: recipe.url,
  comment: [
    {
      "@type": "Comment",
      name: "Author Notes",
      text: recipe.notes,
    },
  ],
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getImageSrcFromSchema = (jsonLD) => {
  const { images } = jsonLD;
  if (!images) return "";

  let imageSrc;
  if (typeof images === "string") imageSrc = images;
  else if (typeof images.url === "string") imageSrc = images.url;
  else if (typeof images[0] === "string") [imageSrc] = images;
  else if (images[0] && typeof images[0].url === "string")
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

const getLongestString = (strings) =>
  strings.reduce((acc, el) => (el.length > acc.length ? el : acc), "");

const getImageSRCsFromSchema = (jsonLD) => {
  const images = jsonLD.image;
  if (!images) return "";

  let imageSRCs = [];
  if (typeof images === "string") imageSRCs = [images];
  else if (typeof images.url === "string") imageSRCs = [images.url];
  else if (typeof images[0] === "string") imageSRCs = images;
  else if (images[0] && typeof images[0].url === "string")
    imageSRCs = images.map((image) => image.url);

  return imageSRCs
    .map((src) => {
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
    .filter((src) => src);
};

const getTitleFromSchema = (jsonLD) => {
  const title = jsonLD.name;

  if (typeof title === "string") return title;

  return "";
};

const getDescriptionFromSchema = (jsonLD) => {
  const { description } = jsonLD;

  if (typeof description === "string") return description;

  return "";
};

const getYieldFromSchema = (jsonLD) => {
  const { recipeYield } = jsonLD;
  if (!recipeYield) return "";

  if (typeof recipeYield === "string") return recipeYield;
  if (Array.isArray(recipeYield) && typeof recipeYield[0] === "string") {
    return getLongestString(recipeYield);
  }

  return "";
};

const convertToISO8601Time = (time) => {
  let timeString = "";

  const hourMatch = time.match(/(\d* ?(\d+\/\d+)?(\.\d+)?) *(hours?|hr?s?)/i);
  if (hourMatch) timeString += `${hourMatch[1].trim()}H`;

  const minuteMatch = time.match(
    /(\d* ?(\d+\/\d+)?(\.\d+)?) *(minutes?|mins?|m)/i,
  );
  if (minuteMatch) timeString += `${minuteMatch[1].trim()}M`;

  if (timeString) return `PT${timeString}`;

  return "";
};

const convertFromISO8601Time = (time) => {
  if (!time.startsWith("PT")) return time;

  return time
    .replace("PT", "")
    .replace("H", " Hour(s) ")
    .replace("M", " Minute(s) ")
    .replace("S", " Seconds(s) ");
};

const getActiveTimeFromSchema = (jsonLD) => {
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

const getTotalTimeFromSchema = (jsonLD) => {
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

const getInstructionsFromSchema = (jsonLD) => {
  const instructions = jsonLD.recipeInstructions;
  if (!instructions) return "";

  if (typeof instructions === "string") return instructions;
  if (typeof instructions[0] === "string") return instructions.join("\n");
  if (instructions[0] && typeof instructions[0].text === "string") {
    return instructions.map((instruction) => instruction.text).join("\n");
  }

  return "";
};

const getIngredientsFromSchema = (jsonLD) => {
  const ingredients = jsonLD.recipeIngredient;
  if (!ingredients) return "";

  if (typeof ingredients === "string") return ingredients;
  if (typeof ingredients[0] === "string") return ingredients.join("\n");
  if (ingredients[0] && typeof ingredients[0].text === "string") {
    return ingredients.map((ingredient) => ingredient.text).join("\n");
  }

  return "";
};

const getLabelsFromSchema = (jsonLD) => {
  const { recipeCategory } = jsonLD;
  if (!recipeCategory) return [];

  if (typeof recipeCategory === "string")
    return recipeCategory.split(",").map((el) => el.trim());
  if (typeof recipeCategory[0] === "string")
    return recipeCategory.map((el) => el.trim());

  return [];
};

const getAuthorNotesComment = (jsonLD) => {
  if (!jsonLD.comment || !jsonLD.comment[0]) return;

  const comment = jsonLD.comment.find((cmt) => cmt.name === "Author Notes");

  if (comment) return comment.text;
};

export const jsonLDToRecipe = (jsonLD) => ({
  title: getTitleFromSchema(jsonLD),
  description: getDescriptionFromSchema(jsonLD),
  yield: getYieldFromSchema(jsonLD),
  activeTime: getActiveTimeFromSchema(jsonLD),
  totalTime: getTotalTimeFromSchema(jsonLD),
  source: jsonLD.creditText || "",
  url: jsonLD.isBasedOn || "",
  notes: getAuthorNotesComment(jsonLD) || "",
  ingredients: getIngredientsFromSchema(jsonLD),
  instructions: getInstructionsFromSchema(jsonLD),
  folder: "main",
  labels: getLabelsFromSchema(jsonLD),
  images: getImageSRCsFromSchema(jsonLD),
});
