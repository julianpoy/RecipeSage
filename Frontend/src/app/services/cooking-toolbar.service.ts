import { Injectable } from '@angular/core';

export interface PinnedRecipe {
  imageUrl?: string
  title: string
  id: string
}

@Injectable({
  providedIn: 'root'
})
export class CookingToolbarService {
  pinnedRecipes: PinnedRecipe[] = [];

  constructor() {}

  pinRecipe(recipe: PinnedRecipe) {
    this.pinnedRecipes.push(recipe);
  }

  isPinned(recipeId: string) {
    return this.pinnedRecipes.some(recipe => recipe.id === recipeId);
  }

  removePin(recipeId: string) {
    const recipeIdx = this.pinnedRecipes.findIndex(recipe => recipe.id === recipeId);

    this.pinnedRecipes.splice(recipeIdx, 1);
  }

  clearPins() {
    this.pinnedRecipes.splice(0, this.pinnedRecipes.length);
  }
}
