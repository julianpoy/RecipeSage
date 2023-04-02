import { Client } from '@elastic/elasticsearch';
import {SearchProvider} from './';

let client: Client;
if (process.env.SEARCH_PROVIDER === 'elasticsearch') {
  if (!process.env.ELASTIC_CONN) throw new Error('Missing Elasticsearch configuration');

  client = new Client({
    node: process.env.ELASTIC_CONN,
  });

  init();
}

async function init() {
  await client.ping();

  const exists = await client.indices.exists({
    index: 'recipes'
  });

  if (!exists) {
    await client.indices.create({
      index: 'recipes',
      body: {
        mappings: {
          properties: {
            title: {
              type: 'text',
              analyzer: 'english', // Enable stemming
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256
                }
              }
            }
          }
        }
      }
    });
  }
};

export const indexRecipes = async (recipes: any[]) => {
  const actions = recipes.reduce((acc, recipe) => {
    if (recipe.toJSON) recipe = recipe.toJSON();

    const { userId, title, source, description, ingredients, instructions, notes } = recipe;

    const action = {
      index: {
        _index: 'recipes',
        _id: recipe.id
      }
    };

    const document = {
      userId,
      title,
      source,
      description,
      ingredients,
      instructions,
      notes
    };

    return [...acc, action, document];
  }, []);

  if (actions.length === 0) return Promise.resolve();

  await client.bulk({
    body: actions
  });
};

export const deleteRecipes = async (recipeIds: string[]) => {
  const actions = recipeIds.map(recipeId => ({
    delete: {
      _index: 'recipes',
      _id: recipeId
    }
  }));

  if (actions.length === 0) return Promise.resolve();

  await client.bulk({
    body: actions
  });
};

export const searchRecipes = async (userIds: string[], queryString: string) => {
  const results = await client.search({
    index: 'recipes',
    body: {
      query: {
        bool: {
          should: userIds.map((userId) => ({
            term: {
              userId,
            }
          })),
          must: {
            multi_match: {
              query: queryString,
              fuzziness: 'AUTO',
              fields: [
                'title^1.5',
                'source^1.2',
                'description^1.2',
                'ingredients',
                'instructions',
                'notes'
              ],
              type: 'most_fields',
              operator: 'and'
            }
          }
        }
      }
    },
    size: Math.min(userIds.length * 500, 1000)
  });

  return results.hits.hits
    .sort((a, b) => b._score - a._score)
    .map((hit) => hit as any);
};

export default {
  indexRecipes,
  deleteRecipes,
  searchRecipes
} as SearchProvider;

