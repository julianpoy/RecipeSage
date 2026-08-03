import type { JsonLD } from "./jsonLD";

const CONTAINER_KEYS = ["@graph", "items"];

const RECIPE_TYPE_PATTERN = /(^|[/#:])recipe$/i;

const MAX_TRAVERSAL_DEPTH = 64;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const typeMatchesRecipe = (node: Record<string, unknown>): boolean => {
  const type = node["@type"] ?? node["type"];
  const types = Array.isArray(type) ? type : [type];
  return types.some(
    (value) => typeof value === "string" && RECIPE_TYPE_PATTERN.test(value),
  );
};

const isRecipeNode = (node: unknown): node is JsonLD =>
  isObject(node) && typeMatchesRecipe(node);

const collect = (node: unknown, found: JsonLD[], depth: number): void => {
  if (depth > MAX_TRAVERSAL_DEPTH) return;

  if (Array.isArray(node)) {
    for (const item of node) collect(item, found, depth + 1);
    return;
  }
  if (!isObject(node)) return;
  const properties: Record<string, unknown> = node;

  if (isRecipeNode(node)) found.push(node);
  for (const key of CONTAINER_KEYS) {
    if (key in properties) collect(properties[key], found, depth + 1);
  }
};

export const collectRecipeNodes = (node: unknown): JsonLD[] => {
  const found: JsonLD[] = [];
  collect(node, found, 0);
  return found;
};
