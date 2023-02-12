import { Injectable } from '@angular/core';

interface ScaleMap {
  [key: string]: number
}

interface CompletionMap {
  [key: string]: string[]
}

@Injectable({
  providedIn: 'root'
})
export class RecipeCompletionTrackerService {
  scaleByRecipeId: ScaleMap = {};
  ingredientCompletionByRecipeId: CompletionMap = {};
  instructionCompletionByRecipeId: CompletionMap = {};

  constructor() {}

  setRecipeScale(recipeId: string, scale: number) {
    this.scaleByRecipeId[recipeId] = scale;
  }

  getRecipeScale(recipeId: string) {
    return this.scaleByRecipeId[recipeId] || 1;
  }

  toggleIngredientComplete(recipeId: string, identifier: string) {
    this.ingredientCompletionByRecipeId[recipeId] = this.ingredientCompletionByRecipeId[recipeId] || [];
    const arr = this.ingredientCompletionByRecipeId[recipeId];

    arr.includes(identifier) ? arr.splice(arr.indexOf(identifier), 1) : arr.push(identifier);
  }

  toggleInstructionComplete(recipeId: string, identifier: string) {
    this.instructionCompletionByRecipeId[recipeId] = this.instructionCompletionByRecipeId[recipeId] || [];
    const arr = this.instructionCompletionByRecipeId[recipeId];

    arr.includes(identifier) ? arr.splice(arr.indexOf(identifier), 1) : arr.push(identifier);
  }

  getInstructionComplete(recipeId: string, identifier: string) {
    return this.instructionCompletionByRecipeId[recipeId]?.includes(identifier) || false;
  }

  getCompletedInstructions(recipeId: string) {
    return [
      ...(this.instructionCompletionByRecipeId[recipeId] || [])
    ];
  }

  getIngredientComplete(recipeId: string, identifier: string) {
    return this.ingredientCompletionByRecipeId[recipeId]?.includes(identifier) || false;
  }

  getCompletedIngredients(recipeId: string) {
    return [
      ...(this.instructionCompletionByRecipeId[recipeId] || [])
    ];
  }
}
