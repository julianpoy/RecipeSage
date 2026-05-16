import { ClipError, clipFromHtml } from "../api/clip";
import {
  MissingTitleError,
  NotLoggedInError,
  saveRecipe,
} from "../api/saveRecipe";
import type { Nutrition, NutritionFields } from "../api/saveRecipe";
import {
  ExtensionPreferences,
  getPreferences,
  getToken,
  setPreferences,
  setToken,
} from "../api/storage";
import { getEffectiveBases } from "../config";
import { isSignInResult } from "../api/messages";
import { validateSession } from "../api/session";
import {
  NutritionAuthError,
  NutritionRateLimitError,
  getNutritionFromText,
} from "../api/nutrition";

const CREDIT_LIMIT_ALERT = `Sorry, limit reached

The autoimport feature is particularly costly to host, so I've had to place a gentle limit on the number of times per day this feature can be used (sorry!). Your usage limit for automatic import & cooking assistant messages resets at 0:00GMT.

Contributing unlocks a larger daily allowance (10x the limit) since it helps to cover the costs. Sorry for the inconvenience!`;

const setMessage = (text: string) => {
  const el = document.getElementById("message");
  if (el) el.innerText = text;
};

const showOnly = (id: string) => {
  document.documentElement.style.display = "initial";
  for (const section of ["login", "tutorial", "importing", "start"]) {
    const el = document.getElementById(section);
    if (el) el.style.display = section === id ? "block" : "none";
  }
  setMessage("");
};

const showTutorial = async () => {
  showOnly("tutorial");
  await chrome.storage.local.set({ seenTutorial: true });
};

const login = async () => {
  setMessage("Signing in...");

  let raw: unknown;
  try {
    raw = await chrome.runtime.sendMessage({ type: "startExtensionAuth" });
  } catch {
    setMessage("Sign-in failed. Please try again.");
    return;
  }

  if (!isSignInResult(raw)) {
    setMessage("Sign-in failed. Please try again.");
    return;
  }

  if (raw.status === "cancelled") {
    setMessage("Sign-in was cancelled.");
    return;
  }
  if (raw.status === "error") {
    setMessage("Sign-in failed. Please try again.");
    return;
  }

  const { seenTutorial } = await getPreferences();
  if (seenTutorial) {
    setMessage(
      "You are now logged in. Click the RecipeSage icon again to clip this website.",
    );
    setTimeout(() => window.close(), 5000);
  } else {
    await showTutorial();
  }
};

const fetchActivePageHtml = async (tabId: number): Promise<string | null> => {
  const [scriptResult] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => document.documentElement.outerHTML,
  });
  if (typeof scriptResult.result !== "string") return null;
  return scriptResult.result;
};

const handleNotLoggedIn = async () => {
  await setToken(null);
  window.alert(
    "Please login. It looks like you're logged out. Please close and re-open the clip tool to login.",
  );
};

const nutritionToFields = (n: Nutrition): NutritionFields => ({
  nutritionServingSize: n.servingSize,
  nutritionCalories: n.calories,
  nutritionTotalFat: n.totalFat,
  nutritionSaturatedFat: n.saturatedFat,
  nutritionTransFat: n.transFat,
  nutritionPolyunsaturatedFat: n.polyunsaturatedFat,
  nutritionMonounsaturatedFat: n.monounsaturatedFat,
  nutritionCholesterol: n.cholesterol,
  nutritionSodium: n.sodium,
  nutritionTotalCarbs: n.totalCarbs,
  nutritionDietaryFiber: n.dietaryFiber,
  nutritionTotalSugars: n.totalSugars,
  nutritionAddedSugars: n.addedSugars,
  nutritionProtein: n.protein,
  nutritionVitaminD: n.vitaminD,
  nutritionCalcium: n.calcium,
  nutritionIron: n.iron,
  nutritionPotassium: n.potassium,
});

const autoClip = async () => {
  showOnly("importing");

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    window.close();
    return;
  }

  const token = await getToken();
  if (!token) {
    await handleNotLoggedIn();
    return;
  }

  const prefs = await getPreferences();
  const includeNutrition = prefs.autoClipNutrition !== false;
  const openAfterImport = prefs.autoOpenAfterImport !== false;

  const { apiBase, webBase } = await getEffectiveBases();

  let html: string | null;
  try {
    html = await fetchActivePageHtml(tab.id);
  } catch (e) {
    console.error(e);
    window.alert("Failed to fetch page content.");
    return;
  }
  if (!html) {
    window.alert("Failed to fetch page content.");
    return;
  }

  let clip;
  try {
    clip = await clipFromHtml(apiBase, token, html);
  } catch (e) {
    if (e instanceof ClipError && e.status === 401) {
      await handleNotLoggedIn();
      return;
    }
    if (e instanceof ClipError && (e.status === 420 || e.status === 429)) {
      window.alert(CREDIT_LIMIT_ALERT);
      return;
    }
    console.error(e);
    window.alert(
      "Failed to clip recipe. If this continues, please report a bug.",
    );
    return;
  }

  let nutritionFields: NutritionFields = {};
  if (
    includeNutrition &&
    clip.nutritionInfo &&
    clip.nutritionInfo.trim().length > 0
  ) {
    try {
      const nutrition = await getNutritionFromText(
        apiBase,
        token,
        clip.nutritionInfo,
      );
      nutritionFields = nutritionToFields(nutrition);
    } catch (e) {
      if (e instanceof NutritionAuthError) {
        await handleNotLoggedIn();
        return;
      }
      if (e instanceof NutritionRateLimitError) {
        window.alert(CREDIT_LIMIT_ALERT);
      } else {
        console.warn("Failed to parse nutrition; saving without nutrition", e);
      }
    }
  }

  try {
    const saved = await saveRecipe(apiBase, token, {
      ...clip,
      ...nutritionFields,
      title: clip.title || tab.title || "",
      url: tab.url || "",
    });

    if (openAfterImport) {
      await chrome.tabs.create({
        url: `${webBase}/app/recipe/${saved.id}`,
        active: true,
      });
      window.close();
    } else {
      setMessage("Recipe imported successfully.");
      setTimeout(() => window.close(), 2000);
    }
  } catch (e) {
    if (e instanceof NotLoggedInError) {
      await handleNotLoggedIn();
      return;
    }
    if (e instanceof MissingTitleError) {
      window.alert(
        "Could not save recipe: no recipe title was detected on the page.",
      );
      return;
    }
    console.error(e);
    window.alert(
      "An error occurred while saving the recipe. Please try again.",
    );
  }
};

const interactiveClip = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    window.close();
    return;
  }

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["/inject/inject.js"],
  });
  window.close();
};

const bindOptionCheckbox = (
  id: string,
  prefKey: keyof ExtensionPreferences,
  prefs: ExtensionPreferences,
) => {
  const el = document.getElementById(id);
  if (!(el instanceof HTMLInputElement)) return;
  const stored = prefs[prefKey];
  el.checked = typeof stored === "boolean" ? stored : true;
  el.onchange = () => {
    void setPreferences({ [prefKey]: el.checked });
  };
};

const wireUp = async () => {
  for (const logo of document.querySelectorAll(".logo")) {
    if (logo instanceof HTMLImageElement) {
      logo.src = chrome.runtime.getURL("./images/recipesage-black-trimmed.png");
    }
  }

  const submitLogin = document.getElementById("login-submit");
  if (submitLogin) submitLogin.onclick = () => void login();

  const tutorialSubmit = document.getElementById("tutorial-submit");
  if (tutorialSubmit) tutorialSubmit.onclick = () => window.close();

  const autoBtn = document.getElementById("auto-import");
  if (autoBtn) autoBtn.onclick = () => void autoClip();
  const interactiveBtn = document.getElementById("interactive-import");
  if (interactiveBtn) interactiveBtn.onclick = () => void interactiveClip();

  const prefs = await getPreferences();
  bindOptionCheckbox("auto-include-nutrition", "autoClipNutrition", prefs);
  bindOptionCheckbox("auto-open-tab", "autoOpenAfterImport", prefs);

  const token = await getToken();
  if (!token) {
    showOnly("login");
    return;
  }
  showOnly("start");

  void (async () => {
    const { apiBase } = await getEffectiveBases();
    const result = await validateSession(apiBase, token);
    if (result !== "invalid") return;
    await setToken(null);
    const startEl = document.getElementById("start");
    if (!startEl || startEl.style.display !== "block") return;
    showOnly("login");
    setMessage("Your session has expired. Please sign in again.");
  })();
};

document.addEventListener("DOMContentLoaded", () => void wireUp());
