import { getToken, setToken } from "../api/storage";
import { getEffectiveBases, getWebBase } from "../config";
import { ClipError, clipFromHtml } from "../api/clip";
import {
  MissingTitleError,
  NotLoggedInError,
  saveRecipe,
} from "../api/saveRecipe";
import {
  NutritionAuthError,
  NutritionRateLimitError,
  getNutritionFromText,
} from "../api/nutrition";
import type {
  ClipRecipeRequest,
  ClipRecipeResponse,
  GetNutritionFromTextRequest,
  GetNutritionFromTextResponse,
  SaveRecipeRequest,
  SaveRecipeResponse,
  SignInResult,
} from "../api/messages";

const parseHandoffFragment = (
  responseUrl: string,
): { token?: string; state?: string; error?: string } | null => {
  let url: URL;
  try {
    url = new URL(responseUrl);
  } catch {
    return null;
  }
  const fragment = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  const params = new URLSearchParams(fragment);
  return {
    token: params.get("token") || undefined,
    state: params.get("state") || undefined,
    error: params.get("error") || undefined,
  };
};

const runSignInFlow = async (): Promise<SignInResult> => {
  const webBase = await getWebBase();
  const redirectUri = chrome.identity.getRedirectURL();
  const state = crypto.randomUUID();
  const authUrl = `${webBase}/app/auth/extension?redirect_uri=${encodeURIComponent(
    redirectUri,
  )}&state=${encodeURIComponent(state)}`;

  let responseUrl: string | undefined;
  try {
    responseUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (/cancel|closed/i.test(message)) {
      return { status: "cancelled" };
    }
    return { status: "error", reason: message };
  }

  if (!responseUrl) {
    return { status: "cancelled" };
  }

  const parsed = parseHandoffFragment(responseUrl);

  if (
    !parsed ||
    parsed.error ||
    !parsed.token ||
    !parsed.state ||
    parsed.state !== state
  ) {
    return { status: "error", reason: "invalid_handoff" };
  }

  await setToken(parsed.token);
  return { status: "ok" };
};

const handleClipRecipe = async (
  req: ClipRecipeRequest,
): Promise<ClipRecipeResponse> => {
  const token = await getToken();
  if (!token) return { ok: false, error: { code: "not-logged-in" } };
  const { apiBase } = await getEffectiveBases();
  try {
    const data = await clipFromHtml(apiBase, token, req.html);
    return { ok: true, data };
  } catch (e) {
    if (e instanceof ClipError && e.status === 401) {
      return { ok: false, error: { code: "not-logged-in" } };
    }
    if (e instanceof ClipError && e.status === 429) {
      return { ok: false, error: { code: "rate-limited" } };
    }
    return {
      ok: false,
      error: {
        code: "unknown",
        message: e instanceof Error ? e.message : String(e),
      },
    };
  }
};

const handleSaveRecipe = async (
  req: SaveRecipeRequest,
): Promise<SaveRecipeResponse> => {
  const token = await getToken();
  if (!token) return { ok: false, error: { code: "not-logged-in" } };
  const { apiBase } = await getEffectiveBases();
  try {
    const data = await saveRecipe(apiBase, token, req.recipe);
    return { ok: true, data };
  } catch (e) {
    if (e instanceof NotLoggedInError) {
      return { ok: false, error: { code: "not-logged-in" } };
    }
    if (e instanceof MissingTitleError) {
      return { ok: false, error: { code: "missing-title" } };
    }
    return {
      ok: false,
      error: {
        code: "unknown",
        message: e instanceof Error ? e.message : String(e),
      },
    };
  }
};

const handleGetNutritionFromText = async (
  req: GetNutritionFromTextRequest,
): Promise<GetNutritionFromTextResponse> => {
  const token = await getToken();
  if (!token) return { ok: false, error: { code: "not-logged-in" } };
  const { apiBase } = await getEffectiveBases();
  try {
    const data = await getNutritionFromText(apiBase, token, req.text);
    return { ok: true, data };
  } catch (e) {
    if (e instanceof NutritionAuthError) {
      return { ok: false, error: { code: "not-logged-in" } };
    }
    if (e instanceof NutritionRateLimitError) {
      return { ok: false, error: { code: "rate-limited" } };
    }
    return {
      ok: false,
      error: {
        code: "unknown",
        message: e instanceof Error ? e.message : String(e),
      },
    };
  }
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "startExtensionAuth") {
    void (async () => {
      const result = await runSignInFlow();
      try {
        sendResponse(result);
      } catch {
        // sendResponse throws if the popup channel closed; token is already persisted
      }
    })();
    return true;
  }
  if (message?.type === "clipRecipe") {
    void (async () => {
      const result = await handleClipRecipe(message);
      try {
        sendResponse(result);
      } catch {
        // channel closed
      }
    })();
    return true;
  }
  if (message?.type === "saveRecipe") {
    void (async () => {
      const result = await handleSaveRecipe(message);
      try {
        sendResponse(result);
      } catch {
        // channel closed
      }
    })();
    return true;
  }
  if (message?.type === "getNutritionFromText") {
    void (async () => {
      const result = await handleGetNutritionFromText(message);
      try {
        sendResponse(result);
      } catch {
        // channel closed
      }
    })();
    return true;
  }
  return false;
});
