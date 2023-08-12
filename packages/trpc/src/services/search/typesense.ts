import * as Typesense from "typesense";
import { Recipe } from "@prisma/client";
import { SearchProvider } from "./";

let client: Typesense.Client;
if (process.env.SEARCH_PROVIDER === "typesense") {
  if (!process.env.TYPESENSE_NODES || !process.env.TYPESENSE_API_KEY)
    throw new Error("Missing Typesense configuration");

  client = new Typesense.Client({
    nodes: JSON.parse(process.env.TYPESENSE_NODES),
    apiKey: process.env.TYPESENSE_API_KEY,
    numRetries: 5,
    connectionTimeoutSeconds: 10,
  });

  init();
}

async function init() {
  const exists = await client.collections("recipes").exists();

  if (!exists) {
    await client.collections().create({
      name: "recipes",
      fields: [
        {
          name: "id",
          type: "string",
          facet: true,
          optional: false,
        },
        {
          name: "userId",
          type: "string",
          facet: true,
          optional: false,
        },
        {
          name: "title",
          type: "string",
          optional: false,
        },
        {
          name: "source",
          type: "string",
          optional: true,
        },
        {
          name: "description",
          type: "string",
          optional: true,
        },
        {
          name: "ingredients",
          type: "string",
          optional: true,
        },
        {
          name: "instructions",
          type: "string",
          optional: true,
        },
        {
          name: "notes",
          type: "string",
          optional: true,
        },
      ],
    });
  }
}

export const indexRecipes = async (recipes: Recipe[]) => {
  const formattedRecipes = recipes.map((recipe) => ({
    id: recipe.id,
    userId: recipe.userId,
    title: recipe.title,
    source: recipe.source,
    description: recipe.description,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    notes: recipe.notes,
  }));

  await client.collections("recipes").documents().import(formattedRecipes, {
    action: "upsert",
  });
};

export const deleteRecipes = async (recipeIds: string[]) => {
  await client
    .collections("recipes")
    .documents()
    .delete({
      filter_by: `id:=[${recipeIds.join(", ")}]`,
    });
};

export const searchRecipes = async (userIds: string[], queryString: string) => {
  const results = await client
    .collections("recipes")
    .documents()
    .search({
      q: queryString,
      query_by: "title,description,ingredients,source,notes,instructions",
      filter_by: `userId:=[${userIds.join(", ")}]`,
      per_page: 250,
      limit_hits: 250, // Desired page count * per_page
      include_fields: "id",
    });

  return (
    results.hits?.map((hit) => (hit.document as Record<string, string>).id) ||
    []
  );
};

export default {
  indexRecipes,
  deleteRecipes,
  searchRecipes,
} as SearchProvider;
