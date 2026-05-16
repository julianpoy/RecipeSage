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
import { initI18n, t } from "../i18n/t";
import { applyI18nToDom } from "../i18n/applyDom";
import { initLangSwitcher } from "../i18n/langSwitcher";

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
  setMessage(t("webextension.action.signingIn"));

  let raw: unknown;
  try {
    raw = await chrome.runtime.sendMessage({ type: "startExtensionAuth" });
  } catch {
    setMessage(t("webextension.action.signInFailed"));
    return;
  }

  if (!isSignInResult(raw)) {
    setMessage(t("webextension.action.signInFailed"));
    return;
  }

  if (raw.status === "cancelled") {
    setMessage(t("webextension.action.signInCancelled"));
    return;
  }
  if (raw.status === "error") {
    setMessage(t("webextension.action.signInFailed"));
    return;
  }

  const { seenTutorial } = await getPreferences();
  if (seenTutorial) {
    setMessage(t("webextension.action.signInSuccessful"));
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
  window.alert(t("webextension.action.notLoggedInPrompt"));
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
    window.alert(t("webextension.action.fetchFailed"));
    return;
  }
  if (!html) {
    window.alert(t("webextension.action.fetchFailed"));
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
      window.alert(t("webextension.creditLimitAlert"));
      return;
    }
    console.error(e);
    window.alert(t("webextension.action.clipFailed"));
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
        window.alert(t("webextension.creditLimitAlert"));
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
      setMessage(t("webextension.action.importSuccess"));
      setTimeout(() => window.close(), 2000);
    }
  } catch (e) {
    if (e instanceof NotLoggedInError) {
      await handleNotLoggedIn();
      return;
    }
    if (e instanceof MissingTitleError) {
      window.alert(t("webextension.action.missingTitle"));
      return;
    }
    console.error(e);
    window.alert(t("webextension.action.saveFailed"));
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

type BooleanPrefKey = {
  [K in keyof ExtensionPreferences]-?: NonNullable<
    ExtensionPreferences[K]
  > extends boolean
    ? K
    : never;
}[keyof ExtensionPreferences];

const bindOptionCheckbox = (
  id: string,
  prefKey: BooleanPrefKey,
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
  await initI18n();
  applyI18nToDom();
  await initLangSwitcher({
    onChange: () => {
      applyI18nToDom();
    },
  });

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
    setMessage(t("webextension.action.sessionExpired"));
  })();
};

document.addEventListener("DOMContentLoaded", () => void wireUp());
