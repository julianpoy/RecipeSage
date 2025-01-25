import { Injectable } from "@angular/core";
import * as Sentry from "@sentry/browser";

import {
  QuickTutorialService,
  QuickTutorialOptions,
} from "~/services/quick-tutorial.service";

const COOKING_TOOLBAR_LOCALSTORAGE_KEY = "cookingToolbar";
const COOKING_TOOLBAR_LOCALSTORAGE_VERSION = "1";

export interface PinnedRecipe {
  imageUrl?: string;
  title: string;
  id: string;
}

@Injectable({
  providedIn: "root",
})
export class CookingToolbarService {
  pinnedRecipes: PinnedRecipe[] = [];

  constructor(private quickTutorialService: QuickTutorialService) {
    try {
      const savedValue = localStorage.getItem(COOKING_TOOLBAR_LOCALSTORAGE_KEY);
      if (savedValue) {
        const parsed = JSON.parse(savedValue);
        this.pinnedRecipes = parsed.pinnedRecipes;
      }
    } catch (e) {
      Sentry.captureException(e);
    }
  }

  pinRecipe(recipe: PinnedRecipe) {
    this.pinnedRecipes.push(recipe);

    this.quickTutorialService.triggerQuickTutorial(
      QuickTutorialOptions.PinnedRecipes,
    );
    this.save();
  }

  isPinned(recipeId: string) {
    return this.pinnedRecipes.some((recipe) => recipe.id === recipeId);
  }

  unpinRecipe(recipeId: string) {
    const recipeIdx = this.pinnedRecipes.findIndex(
      (recipe) => recipe.id === recipeId,
    );

    this.pinnedRecipes.splice(recipeIdx, 1);
    this.save();
  }

  clearPins() {
    this.pinnedRecipes.splice(0, this.pinnedRecipes.length);
    this.save();
  }

  save() {
    localStorage.setItem(
      COOKING_TOOLBAR_LOCALSTORAGE_KEY,
      JSON.stringify({
        pinnedRecipes: this.pinnedRecipes,
        version: COOKING_TOOLBAR_LOCALSTORAGE_VERSION,
      }),
    );
  }
}
