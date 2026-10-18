import { System } from "@recipesage/unitz-ts";
import {
  inferRecipeNotation,
  parseIngredients,
  parseInstructions,
  parseNotes,
  SupportedLanguages,
  type DecimalNotation,
  type ParsedIngredient,
  type ParsedInstruction,
  type ParsedNote,
} from "@recipesage/util/shared";
import type { UnitSystem } from "../../modals/scale-recipe/ScaleRecipe";
import { linkifyHtml } from "../../utils/linkify";
import { resolveStorageLocation } from "../../utils/resolveStorageLocation";
import { sanitizeHtml } from "../../utils/sanitizeHtml";

export interface ParsedRecipeContent {
  decimalNotationMode: DecimalNotation;
  ingredients: ParsedIngredient[];
  instructions: ParsedInstruction[];
  notes?: ParsedNote[];
}

const getTargetSystem = (unitSystem: UnitSystem): System | undefined => {
  if (unitSystem === "metric") return System.METRIC;
  if (unitSystem === "imperial") return System.US;
  return undefined;
};

export const parseRecipeContent = (
  recipe: {
    ingredients: string;
    instructions: string;
    notes: string;
    images: { location: string; order: number }[];
  },
  scale: string,
  unitSystem: UnitSystem,
  locale: string,
): ParsedRecipeContent => {
  const targetSystem = getTargetSystem(unitSystem);

  const decimalNotationMode = inferRecipeNotation(
    recipe,
    locale || SupportedLanguages.EN_US,
  );

  const images = [...recipe.images]
    .sort((a, b) => a.order - b.order)
    .map((image) => ({ url: resolveStorageLocation(image.location) }));

  const ingredients = parseIngredients(recipe.ingredients, scale, {
    targetSystem,
    decimalNotationMode,
  }).map((ingredient) => ({
    ...ingredient,
    htmlContent: sanitizeHtml(ingredient.htmlContent),
  }));
  const instructions = parseInstructions(recipe.instructions, scale, {
    targetSystem,
    decimalNotationMode,
    images,
  }).map((instruction) => ({
    ...instruction,
    htmlContent: sanitizeHtml(instruction.htmlContent),
  }));
  const notes =
    recipe.notes && recipe.notes.length > 0
      ? parseNotes(recipe.notes, scale, {
          targetSystem,
          decimalNotationMode,
          images,
        }).map((note) => ({
          ...note,
          htmlContent: sanitizeHtml(linkifyHtml(note.htmlContent)),
        }))
      : undefined;

  return {
    decimalNotationMode,
    ingredients,
    instructions,
    notes,
  };
};
