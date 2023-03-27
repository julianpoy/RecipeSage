import Meilisearch from './meilisearch';
import ElasticSearch from './elasticsearch';

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
};

if (!process.env.SEARCH_PROVIDER) throw new Error('SEARCH_PROVIDER not set');
const searchProvider = searchProviders[process.env.SEARCH_PROVIDER];

export const indexRecipes = searchProvider.indexRecipes;
export const deleteRecipes = searchProvider.deleteRecipes;
export const searchRecipes = searchProvider.searchRecipes;

