import * as Meilisearch from "./meilisearch";
import * as ElasticSearch from "./elasticsearch";
import * as Typesense from "./typesense";
import * as Stub from "./stub";
import { Recipe } from "@prisma/client";

export interface SearchProvider {
  indexRecipes: (recipes: Recipe[]) => Promise<void>;
  deleteRecipes: (recipeIds: string[]) => Promise<void>;
  searchRecipes: (userIds: string[], queryString: string) => Promise<string[]>;
}

const searchProviders: {
  [key: string]: SearchProvider | undefined;
} = {
  meilisearch: Meilisearch,
  elasticsearch: ElasticSearch,
  typesense: Typesense,
  none: Stub,
};

if (!process.env.SEARCH_PROVIDER) {
  throw new Error(
    'SEARCH_PROVIDER not set. Can be set to "elasticsearch", "meilisearch", "typesense" or "none".',
  );
}
const searchProvider = searchProviders[process.env.SEARCH_PROVIDER];
if (!searchProvider) {
  throw new Error(
    'SEARCH_PROVIDER must be set to "elasticsearch", "meilisearch", "typesense" or "none".',
  );
}

export const indexRecipes = searchProvider.indexRecipes;
export const deleteRecipes = searchProvider.deleteRecipes;
export const searchRecipes = searchProvider.searchRecipes;
