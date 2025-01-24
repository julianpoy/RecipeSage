import { Injectable } from "@angular/core";
import * as Sentry from "@sentry/browser";
import { deletePropertiesInObjectByReference } from "../utils/deletePropertiesInObjectByReference";

const COMPLETION_TRACKER_LOCALSTORAGE_KEY = "completionTracker";
const COMPLETION_TRACKER_LOCALSTORAGE_VERSION = "1";

@Injectable({
  providedIn: "root",
})
export class RecipeCompletionTrackerService {
  scaleByRecipeId: { [key: string]: number } = {};
  ingredientCompletionByRecipeId: { [key: string]: number[] } = {};
  instructionCompletionByRecipeId: { [key: string]: number[] } = {};

  constructor() {
    try {
      const savedValue = localStorage.getItem(
        COMPLETION_TRACKER_LOCALSTORAGE_KEY,
      );
      if (savedValue) {
        const parsed = JSON.parse(savedValue);

        this.scaleByRecipeId = parsed.scaleByRecipeId;
        this.ingredientCompletionByRecipeId =
          parsed.ingredientCompletionByRecipeId;
        this.instructionCompletionByRecipeId =
          parsed.instructionCompletionByRecipeId;
      }
    } catch (e) {
      Sentry.captureException(e);
    }
  }

  setRecipeScale(recipeId: string, scale: number): void {
    this.scaleByRecipeId[recipeId] = scale;
    this.save();
  }

  getRecipeScale(recipeId: string): number {
    return this.scaleByRecipeId[recipeId] || 1;
  }

  toggleIngredientComplete(recipeId: string, idx: number): void {
    this.ingredientCompletionByRecipeId[recipeId] =
      this.ingredientCompletionByRecipeId[recipeId] || [];
    const arr = this.ingredientCompletionByRecipeId[recipeId];

    arr.includes(idx) ? arr.splice(arr.indexOf(idx), 1) : arr.push(idx);
    this.save();
  }

  toggleInstructionComplete(recipeId: string, idx: number): void {
    this.instructionCompletionByRecipeId[recipeId] =
      this.instructionCompletionByRecipeId[recipeId] || [];
    const arr = this.instructionCompletionByRecipeId[recipeId];

    arr.includes(idx) ? arr.splice(arr.indexOf(idx), 1) : arr.push(idx);
    this.save();
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

  save() {
    localStorage.setItem(
      COMPLETION_TRACKER_LOCALSTORAGE_KEY,
      JSON.stringify({
        scaleByRecipeId: this.scaleByRecipeId,
        ingredientCompletionByRecipeId: this.ingredientCompletionByRecipeId,
        instructionCompletionByRecipeId: this.instructionCompletionByRecipeId,
        version: COMPLETION_TRACKER_LOCALSTORAGE_VERSION,
      }),
    );
  }

  reset() {
    deletePropertiesInObjectByReference(this.scaleByRecipeId);
    deletePropertiesInObjectByReference(this.ingredientCompletionByRecipeId);
    deletePropertiesInObjectByReference(this.instructionCompletionByRecipeId);

    localStorage.removeItem(COMPLETION_TRACKER_LOCALSTORAGE_KEY);
  }
}
