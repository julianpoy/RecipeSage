import { ClipError, clipFromHtml } from "../api/clip";
import {
  MissingTitleError,
  NotLoggedInError,
  saveRecipe,
} from "../api/saveRecipe";
import { getPreferences, getToken, setToken } from "../api/storage";
import { getEffectiveBases } from "../config";
import { isSignInResult } from "../api/messages";
import { validateSession } from "../api/session";

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
    if (e instanceof ClipError && e.status === 429) {
      window.alert(
        "Daily limit reached for clipping. Cooking credits reset at 0:00 GMT. Consider contributing for a larger daily allowance.",
      );
      return;
    }
    console.error(e);
    window.alert(
      "Failed to clip recipe. If this continues, please report a bug.",
    );
    return;
  }

  try {
    const saved = await saveRecipe(apiBase, token, {
      ...clip,
      title: clip.title || tab.title || "",
      url: tab.url || "",
    });

    await chrome.tabs.create({
      url: `${webBase}/app/recipe/${saved.id}`,
      active: true,
    });
    window.close();
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
