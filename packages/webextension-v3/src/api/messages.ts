import type { ClipResult } from "./clip";
import type {
  FindRecipesByUrlResult,
  Nutrition,
  SaveRecipeInput,
  SaveRecipeResult,
} from "./saveRecipe";

export interface SignInResult {
  status: "ok" | "cancelled" | "error";
  reason?: string;
}

export const isSignInResult = (value: unknown): value is SignInResult => {
  if (typeof value !== "object" || value === null) return false;
  if (!("status" in value)) return false;
  const status = value.status;
  if (status !== "ok" && status !== "cancelled" && status !== "error") {
    return false;
  }
  if ("reason" in value && typeof value.reason !== "string") return false;
  return true;
};

export type BridgeErrorCode =
  | "not-logged-in"
  | "rate-limited"
  | "missing-title"
  | "unknown";

export interface BridgeError {
  code: BridgeErrorCode;
  message?: string;
}

export interface ClipRecipeRequest {
  type: "clipRecipe";
  html: string;
}

export interface SaveRecipeRequest {
  type: "saveRecipe";
  recipe: SaveRecipeInput;
}

export interface GetNutritionFromTextRequest {
  type: "getNutritionFromText";
  text: string;
}

export interface FindRecipesByUrlRequest {
  type: "findRecipesByUrl";
  url: string;
}

export type ClipRecipeResponse =
  | { ok: true; data: ClipResult }
  | { ok: false; error: BridgeError };

export type SaveRecipeResponse =
  | { ok: true; data: SaveRecipeResult }
  | { ok: false; error: BridgeError };

export type GetNutritionFromTextResponse =
  | { ok: true; data: Nutrition }
  | { ok: false; error: BridgeError };

export type FindRecipesByUrlResponse =
  | { ok: true; data: FindRecipesByUrlResult }
  | { ok: false; error: BridgeError };

const isBridgeError = (value: unknown): value is BridgeError => {
  if (typeof value !== "object" || value === null) return false;
  if (!("code" in value) || typeof value.code !== "string") return false;
  if (
    "message" in value &&
    value.message !== undefined &&
    typeof value.message !== "string"
  ) {
    return false;
  }
  return true;
};

export const isClipRecipeResponse = (
  value: unknown,
): value is ClipRecipeResponse => {
  if (typeof value !== "object" || value === null) return false;
  if (!("ok" in value)) return false;
  if (value.ok === true) {
    return (
      "data" in value && typeof value.data === "object" && value.data !== null
    );
  }
  if (value.ok === false) {
    return "error" in value && isBridgeError(value.error);
  }
  return false;
};

export const isSaveRecipeResponse = (
  value: unknown,
): value is SaveRecipeResponse => {
  if (typeof value !== "object" || value === null) return false;
  if (!("ok" in value)) return false;
  if (value.ok === true) {
    if (!("data" in value)) return false;
    if (typeof value.data !== "object" || value.data === null) return false;
    return "id" in value.data && typeof value.data.id === "string";
  }
  if (value.ok === false) {
    return "error" in value && isBridgeError(value.error);
  }
  return false;
};

export const isGetNutritionFromTextResponse = (
  value: unknown,
): value is GetNutritionFromTextResponse => {
  if (typeof value !== "object" || value === null) return false;
  if (!("ok" in value)) return false;
  if (value.ok === true) {
    return (
      "data" in value && typeof value.data === "object" && value.data !== null
    );
  }
  if (value.ok === false) {
    return "error" in value && isBridgeError(value.error);
  }
  return false;
};

export const isFindRecipesByUrlResponse = (
  value: unknown,
): value is FindRecipesByUrlResponse => {
  if (typeof value !== "object" || value === null) return false;
  if (!("ok" in value)) return false;
  if (value.ok === true) {
    if (!("data" in value)) return false;
    if (typeof value.data !== "object" || value.data === null) return false;
    if (!("recipes" in value.data) || !Array.isArray(value.data.recipes)) {
      return false;
    }
    for (const r of value.data.recipes) {
      if (typeof r !== "object" || r === null) return false;
      if (!("id" in r) || typeof r.id !== "string") return false;
    }
    return true;
  }
  if (value.ok === false) {
    return "error" in value && isBridgeError(value.error);
  }
  return false;
};
