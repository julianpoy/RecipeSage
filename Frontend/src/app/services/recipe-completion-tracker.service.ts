import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RecipeCompletionTrackerService {
  scaleByRecipeId = {};
  ingredientCompletionByRecipeId = {};
  instructionCompletionByRecipeId = {};

  constructor() {}

  setRecipeScale(recipeId: string, scale: number) {
    this.scaleByRecipeId[recipeId] = scale;
  }

  getRecipeScale(recipeId: string) {
    return this.scaleByRecipeId[recipeId] || 1;
  }

  toggleIngredientComplete(recipeId: string, idx: number) {
    this.ingredientCompletionByRecipeId[recipeId] = this.ingredientCompletionByRecipeId[recipeId] || [];
    const arr = this.ingredientCompletionByRecipeId[recipeId];

    arr.includes(idx) ? arr.splice(arr.indexOf(idx), 1) : arr.push(idx);
  }

  toggleInstructionComplete(recipeId: string, idx: number) {
    this.instructionCompletionByRecipeId[recipeId] = this.instructionCompletionByRecipeId[recipeId] || [];
    const arr = this.instructionCompletionByRecipeId[recipeId];

    arr.includes(idx) ? arr.splice(arr.indexOf(idx), 1) : arr.push(idx);
  }

  getInstructionComplete(recipeId: string, idx: number) {
    return this.instructionCompletionByRecipeId[recipeId]?.includes(idx) || false;
  }

  getIngredientComplete(recipeId: string, idx: number) {
    return this.ingredientCompletionByRecipeId[recipeId]?.includes(idx) || false;
  }
}
