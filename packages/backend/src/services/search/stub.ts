import {SearchProvider} from "./index";

export const indexRecipes = async (recipes: any[]) => {
  return Promise.resolve();
};

export const deleteRecipes = async (recipeIds: string[]) => {
  return Promise.resolve();
};

export const searchRecipes = async (userIds: string[], queryString: string) => {
  return Promise.resolve([]);
};

export default {
  indexRecipes,
  deleteRecipes,
  searchRecipes
} as SearchProvider;

