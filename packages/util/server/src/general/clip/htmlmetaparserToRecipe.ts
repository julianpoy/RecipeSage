import he from "he";
import type { Result } from "htmlmetaparser";
import type { StandardizedRecipeImportEntry } from "../../db";
import { JsonLD, jsonLDToStandardizedRecipeImportEntry } from "../jsonLD";
import { recipeGroundingScore } from "./isRecipeGrounded";

const cleanText = (value: string): string =>
  he
    .decode(value.replace(/<\/?[a-zA-Z][^>]*>/g, " "))
    .replace(/[^\S\n]+/g, " ")
    .trim();

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeNode = (value: unknown): unknown => {
  if (typeof value === "string") return cleanText(value);
  if (Array.isArray(value)) {
    const normalized = value.map(normalizeNode);
    const [only] = normalized;
    if (
      normalized.length === 1 &&
      (typeof only === "string" || typeof only === "number")
    ) {
      return only;
    }
    return normalized;
  }
  if (isObject(value)) {
    if ("@value" in value) return normalizeNode(value["@value"]);

    const normalized: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      normalized[key] = normalizeNode(entry);
    }
    return normalized;
  }
  return value;
};

const typeMatchesRecipe = (node: Record<string, unknown>): boolean => {
  const type = node["@type"] ?? node["type"];
  const types = Array.isArray(type) ? type : [type];
  return types.some(
    (value) =>
      typeof value === "string" && value.toLowerCase().endsWith("recipe"),
  );
};

const isRecipeNode = (node: unknown): node is JsonLD =>
  isObject(node) && typeMatchesRecipe(node);

const collectRecipeNodes = (node: unknown, found: JsonLD[]): void => {
  if (Array.isArray(node)) {
    for (const item of node) collectRecipeNodes(item, found);
    return;
  }
  if (!isObject(node)) return;

  if (isRecipeNode(node)) found.push(node);
  if ("@graph" in node) collectRecipeNodes(node["@graph"], found);
  if ("items" in node) collectRecipeNodes(node["items"], found);
};

const segmentCount = (value: unknown): number => {
  if (typeof value === "string") {
    return value.split("\n").filter((line) => line.trim().length > 0).length;
  }
  if (Array.isArray(value)) return value.length;
  return 0;
};

const recipeRichness = (node: JsonLD): number =>
  segmentCount(node.recipeIngredient) + segmentCount(node.recipeInstructions);

const findRichestRecipe = (nodes: JsonLD[]): JsonLD | undefined => {
  if (nodes.length === 0) return undefined;
  return nodes.reduce((best, current) =>
    recipeRichness(current) > recipeRichness(best) ? current : best,
  );
};

const toEntry = (
  recipe: JsonLD,
  structured: Result,
): StandardizedRecipeImportEntry => {
  const inLanguage =
    typeof recipe.inLanguage === "string"
      ? recipe.inLanguage
      : structured.html?.language;

  return jsonLDToStandardizedRecipeImportEntry({ ...recipe, inLanguage });
};

export const htmlmetaparserToRecipe = (
  structured: Result,
  source: "jsonld" | "microdata",
  pageText?: string,
): StandardizedRecipeImportEntry | undefined => {
  const root = normalizeNode(
    source === "jsonld" ? structured.jsonld : structured.microdata,
  );

  const candidates: JsonLD[] = [];
  collectRecipeNodes(root, candidates);
  if (candidates.length === 0) return undefined;

  if (candidates.length === 1 || pageText === undefined) {
    const recipe = findRichestRecipe(candidates);
    return recipe ? toEntry(recipe, structured) : undefined;
  }

  const scored = candidates.map((recipe) => {
    const entry = toEntry(recipe, structured);
    return {
      entry,
      grounding: recipeGroundingScore(entry.recipe, pageText) ?? 0,
      richness: recipeRichness(recipe),
    };
  });
  scored.sort((a, b) => b.grounding - a.grounding || b.richness - a.richness);

  return scored[0].entry;
};
