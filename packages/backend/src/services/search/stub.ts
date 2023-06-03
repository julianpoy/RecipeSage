import { SearchProvider } from "./index";

export const indexRecipes = async () => {
  return Promise.resolve();
};

export const deleteRecipes = async () => {
  return Promise.resolve();
};

export const searchRecipes = async () => {
  return Promise.resolve([]);
};

export default {
  indexRecipes,
  deleteRecipes,
  searchRecipes,
} as SearchProvider;
