import { ClipError } from "./clip";
import type { ClipResult } from "./clip";
import { MissingTitleError, NotLoggedInError } from "./saveRecipe";
import type {
  Nutrition,
  SaveRecipeInput,
  SaveRecipeResult,
} from "./saveRecipe";
import { NutritionAuthError, NutritionRateLimitError } from "./nutrition";
import {
  isClipRecipeResponse,
  isGetNutritionFromTextResponse,
  isSaveRecipeResponse,
  type BridgeError,
} from "./messages";

const bridgeErrorToException = (error: BridgeError): Error => {
  if (error.code === "not-logged-in") return new NotLoggedInError();
  if (error.code === "missing-title") return new MissingTitleError();
  if (error.code === "rate-limited") return new ClipError("Rate limited", 429);
  return new Error(error.message || "Unknown error");
};

export const clipFromHtmlViaBg = async (html: string): Promise<ClipResult> => {
  const raw = await chrome.runtime.sendMessage({ type: "clipRecipe", html });
  if (!isClipRecipeResponse(raw)) {
    throw new Error("Invalid response from background");
  }
  if (!raw.ok) throw bridgeErrorToException(raw.error);
  return raw.data;
};

export const saveRecipeViaBg = async (
  recipe: SaveRecipeInput,
): Promise<SaveRecipeResult> => {
  const raw = await chrome.runtime.sendMessage({ type: "saveRecipe", recipe });
  if (!isSaveRecipeResponse(raw)) {
    throw new Error("Invalid response from background");
  }
  if (!raw.ok) throw bridgeErrorToException(raw.error);
  return raw.data;
};

const nutritionBridgeErrorToException = (error: BridgeError): Error => {
  if (error.code === "not-logged-in") return new NutritionAuthError();
  if (error.code === "rate-limited") return new NutritionRateLimitError();
  return new Error(error.message || "Unknown error");
};

export const getNutritionFromTextViaBg = async (
  text: string,
): Promise<Nutrition> => {
  const raw = await chrome.runtime.sendMessage({
    type: "getNutritionFromText",
    text,
  });
  if (!isGetNutritionFromTextResponse(raw)) {
    throw new Error("Invalid response from background");
  }
  if (!raw.ok) throw nutritionBridgeErrorToException(raw.error);
  return raw.data;
};
