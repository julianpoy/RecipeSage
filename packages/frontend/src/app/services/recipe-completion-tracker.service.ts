import { Injectable } from "@angular/core";

@Injectable({
  providedIn: "root",
})
export class RecipeCompletionTrackerService {
  scaleByRecipeId: { [key: string]: number } = {};
  ingredientCompletionByRecipeId: { [key: string]: number[] } = {};
  instructionCompletionByRecipeId: { [key: string]: number[] } = {};

  constructor() {}

  setRecipeScale(recipeId: string, scale: number): void {
    this.scaleByRecipeId[recipeId] = scale;
  }

  getRecipeScale(recipeId: string): number {
    return this.scaleByRecipeId[recipeId] || 1;
  }

  toggleIngredientComplete(recipeId: string, idx: number): void {
    this.ingredientCompletionByRecipeId[recipeId] =
      this.ingredientCompletionByRecipeId[recipeId] || [];
    const arr = this.ingredientCompletionByRecipeId[recipeId];

    arr.includes(idx) ? arr.splice(arr.indexOf(idx), 1) : arr.push(idx);
  }

  toggleInstructionComplete(recipeId: string, idx: number): void {
    this.instructionCompletionByRecipeId[recipeId] =
      this.instructionCompletionByRecipeId[recipeId] || [];
    const arr = this.instructionCompletionByRecipeId[recipeId];

    arr.includes(idx) ? arr.splice(arr.indexOf(idx), 1) : arr.push(idx);
  }

  getInstructionComplete(recipeId: string, idx: number): boolean {
    return (
      this.instructionCompletionByRecipeId[recipeId]?.includes(idx) || false
    );
  }

  getIngredientComplete(recipeId: string, idx: number): boolean {
    return (
      this.ingredientCompletionByRecipeId[recipeId]?.includes(idx) || false
    );
  }
}
