import * as Meilisearch from './meilisearch';
import * as ElasticSearch from './elasticsearch';
import * as Stub from './stub';

export interface SearchProvider {
  indexRecipes: (recipes: any[]) => Promise<any>;
  deleteRecipes: (recipeIds: string[]) => Promise<any>;
  searchRecipes: (userIds: string[], queryString: string) => Promise<any[]>;
}

const searchProviders: {
  [key: string]: SearchProvider;
} = {
  meilisearch: Meilisearch,
  elasticsearch: ElasticSearch,
  none: Stub,
};

if (!process.env.SEARCH_PROVIDER) throw new Error(
  'SEARCH_PROVIDER not set. Can be set to "elasticsearch", "meilisearch", or "none".'
);
const searchProvider = searchProviders[process.env.SEARCH_PROVIDER];

export const indexRecipes = searchProvider.indexRecipes;
export const deleteRecipes = searchProvider.deleteRecipes;
export const searchRecipes = searchProvider.searchRecipes;

