import { MeiliSearch, MeiliSearchApiError } from 'meilisearch';
import {SearchProvider} from './';

let client: MeiliSearch;

if (
  process.env.SEARCH_PROVIDER === 'meilisearch'
) {
  if (
    !process.env.MEILI_HOST
    || !process.env.MEILI_API_KEY
  ) throw new Error('Missing MeiliSearch configuration');

  client = new MeiliSearch({
    host: process.env.MEILI_HOST,
    apiKey: process.env.MEILI_API_KEY,
  });

  init();
}

async function init() {
  try {
    await client.getIndex('recipes');
  } catch(e) {
    if (
      e instanceof MeiliSearchApiError
      && e.code === 'index_not_found'
    ) {
      console.log('Creating meilisearch index');

      await client.createIndex('recipes', {
        primaryKey: 'id',
      });
    } else {
      throw e;
    }
  }

  await client.index('recipes').updateFilterableAttributes([
    'id',
    'userId'
  ]);

  await client.index('recipes').updateSearchableAttributes([
    'title',
    'source',
    'description',
    'ingredients',
    'instructions',
    'notes',
  ]);
}

export const indexRecipes = async (recipes: any[]) => {
  const indexableRecipes = recipes.map((recipe) => ({
    id: recipe.id,
    userId: recipe.userId,
    title: recipe.title,
    source: recipe.source,
    description: recipe.description,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    notes: recipe.notes,
  }));

  await client.index('recipes').addDocuments(indexableRecipes, {
    primaryKey: 'id',
  });
};

export const deleteRecipes = async (recipeIds: string[]) => {
  await client.index('recipes').deleteDocuments(recipeIds);
};

export const searchRecipes = async (userIds: string[], queryString: string) => {
  const results = await client.index('recipes').search(queryString, {
    filter: `userId IN [${userIds.join(',')}]`,
    attributesToRetrieve: ['id'],
  });

  return results.hits.map((hit) => hit.id satisfies string);
};

export default {
  indexRecipes,
  deleteRecipes,
  searchRecipes,
} as SearchProvider;

