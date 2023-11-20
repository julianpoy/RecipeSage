import { Injectable } from "@angular/core";

import {
  QuickTutorialService,
  QuickTutorialOptions,
} from "~/services/quick-tutorial.service";

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

  constructor(private quickTutorialService: QuickTutorialService) {}

  pinRecipe(recipe: PinnedRecipe) {
    this.pinnedRecipes.push(recipe);

    this.quickTutorialService.triggerQuickTutorial(
      QuickTutorialOptions.PinnedRecipes,
    );
  }

  isPinned(recipeId: string) {
    return this.pinnedRecipes.some((recipe) => recipe.id === recipeId);
  }

  unpinRecipe(recipeId: string) {
    const recipeIdx = this.pinnedRecipes.findIndex(
      (recipe) => recipe.id === recipeId,
    );

    this.pinnedRecipes.splice(recipeIdx, 1);
  }

  clearPins() {
    this.pinnedRecipes.splice(0, this.pinnedRecipes.length);
  }
}
