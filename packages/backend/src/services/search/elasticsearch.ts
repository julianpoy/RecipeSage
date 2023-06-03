import { Client } from "@elastic/elasticsearch";
import dedent from "ts-dedent";
import { SearchProvider } from "./";

let client: Client;
if (process.env.SEARCH_PROVIDER === "elasticsearch") {
  if (!process.env.ELASTIC_CONN)
    throw new Error("Missing Elasticsearch configuration");

  client = new Client({
    node: process.env.ELASTIC_CONN,
  });

  init();
}

async function init() {
  await client.ping();

  const exists = await client.indices.exists({
    index: "recipes",
  });

  if (!exists) {
    await client.indices.create({
      index: "recipes",
      body: {
        mappings: {
          properties: {
            title: {
              type: "text",
              analyzer: "english", // Enable stemming
              fields: {
                keyword: {
                  type: "keyword",
                  ignore_above: 256,
                },
              },
            },
            userId: {
              type: "keyword",
            },
          },
        },
      },
    });
  }
}

export const indexRecipes = async (recipes: any[]) => {
  const actions = recipes.reduce((acc, recipe) => {
    if (recipe.toJSON) recipe = recipe.toJSON();

    const {
      userId,
      title,
      source,
      description,
      ingredients,
      instructions,
      notes,
    } = recipe;

    const action = {
      index: {
        _index: "recipes",
        _id: recipe.id,
      },
    };

    const fullText = dedent`
      ${title}
      ${source}
      ${description}
      ${ingredients}
      ${instructions}
      ${notes}
    `;

    const document = {
      userId,
      title,
      ingredients,
      fullText,
    };

    return [...acc, action, document];
  }, []);

  if (actions.length === 0) return Promise.resolve();

  await client.bulk({
    body: actions,
  });
};

export const deleteRecipes = async (recipeIds: string[]) => {
  const actions = recipeIds.map((recipeId) => ({
    delete: {
      _index: "recipes",
      _id: recipeId,
    },
  }));

  if (actions.length === 0) return Promise.resolve();

  await client.bulk({
    body: actions,
  });
};

export const searchRecipes = async (userIds: string[], queryString: string) => {
  const results = await client.search({
    index: "recipes",
    body: {
      query: {
        bool: {
          should: [
            {
              match_phrase_prefix: {
                // Increase score of items with titles that match the entire phrase exactly
                title: {
                  query: queryString,
                },
              },
            },
          ],
          must: {
            match_bool_prefix: {
              // Items must contain all terms that were searched for
              fullText: {
                query: queryString,
                fuzziness: "AUTO",
                operator: "and",
              },
            },
          },
          filter: {
            terms: {
              userId: userIds,
            },
          },
        },
      },
    },
    size: Math.min(userIds.length * 500, 1000),
  });

  return results.hits.hits
    .sort((a, b) => b._score - a._score)
    .map((hit) => hit._id);
};

export default {
  indexRecipes,
  deleteRecipes,
  searchRecipes,
} as SearchProvider;
