import { create } from "zustand";
import * as Sentry from "@sentry/react";
import {
  quickTutorialService,
  QuickTutorialOptions,
} from "../services/quickTutorialService";

const COOKING_TOOLBAR_LOCALSTORAGE_KEY = "cookingToolbar";
const COOKING_TOOLBAR_LOCALSTORAGE_VERSION = "1";

export interface PinnedRecipe {
  imageUrl?: string;
  title: string;
  id: string;
  path?: string;
}

const loadPinnedRecipes = (): PinnedRecipe[] => {
  try {
    const savedValue = localStorage.getItem(COOKING_TOOLBAR_LOCALSTORAGE_KEY);
    if (savedValue) {
      const parsed = JSON.parse(savedValue);
      if (Array.isArray(parsed?.pinnedRecipes)) return parsed.pinnedRecipes;
    }
  } catch (e) {
    Sentry.captureException(e);
  }
  return [];
};

const savePinnedRecipes = (pinnedRecipes: PinnedRecipe[]) => {
  localStorage.setItem(
    COOKING_TOOLBAR_LOCALSTORAGE_KEY,
    JSON.stringify({
      pinnedRecipes,
      version: COOKING_TOOLBAR_LOCALSTORAGE_VERSION,
    }),
  );
};

export const cookingToolbarStore = create<{
  pinnedRecipes: PinnedRecipe[];
  pinRecipe: (recipe: PinnedRecipe) => void;
  isPinned: (recipeId: string) => boolean;
  unpinRecipe: (recipeId: string) => void;
  clearPins: () => void;
}>((set, get) => ({
  pinnedRecipes: loadPinnedRecipes(),

  pinRecipe: (recipe) => {
    const pinnedRecipes = [...get().pinnedRecipes, recipe];
    set({ pinnedRecipes });
    savePinnedRecipes(pinnedRecipes);
    void quickTutorialService.triggerQuickTutorial(
      QuickTutorialOptions.PinnedRecipes,
    );
  },

  isPinned: (recipeId) =>
    get().pinnedRecipes.some((recipe) => recipe.id === recipeId),

  unpinRecipe: (recipeId) => {
    const pinnedRecipes = get().pinnedRecipes.filter(
      (recipe) => recipe.id !== recipeId,
    );
    set({ pinnedRecipes });
    savePinnedRecipes(pinnedRecipes);
  },

  clearPins: () => {
    set({ pinnedRecipes: [] });
    savePinnedRecipes([]);
  },
}));
