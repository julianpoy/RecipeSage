import { TRPCClientError } from "@trpc/client";
import { ClipError, clipFromHtml } from "../api/clip";
import {
  MissingTitleError,
  NotLoggedInError,
  saveRecipe,
} from "../api/saveRecipe";
import { getToken, setToken } from "../api/storage";
import { createTrpc } from "../api/trpc";
import { getApiBase, getEffectiveBases } from "../config";

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
};

const showTutorial = async () => {
  showOnly("tutorial");
  await chrome.storage.local.set({ seenTutorial: true });
};

const readLoginInputs = () => {
  const emailEl = document.getElementById("email");
  const passwordEl = document.getElementById("password");
  if (
    !(emailEl instanceof HTMLInputElement) ||
    !(passwordEl instanceof HTMLInputElement)
  ) {
    return null;
  }
  return { email: emailEl.value, password: passwordEl.value };
};

const login = async () => {
  const credentials = readLoginInputs();
  if (!credentials) return;

  try {
    const apiBase = await getApiBase();
    const result = await createTrpc(apiBase).users.login.mutate(credentials);
    await setToken(result.token);

    const stored = await chrome.storage.local.get(["seenTutorial"]);

    if (stored.seenTutorial) {
      setMessage(
        "You are now logged in. Click the RecipeSage icon again to clip this website.",
      );
      setTimeout(() => window.close(), 5000);
    } else {
      await showTutorial();
    }
  } catch (e) {
    if (e instanceof TRPCClientError) {
      const code = e.data?.httpStatus;
      if (code === 403 || code === 404) {
        setMessage("It looks like that email or password isn't correct.");
        return;
      }
    }
    setMessage(
      "Something went wrong. Please check your internet connection and try again.",
    );
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

  const onEnter = (event: KeyboardEvent) => {
    if (event.key === "Enter") void login();
  };
  for (const id of ["email", "password"]) {
    const el = document.getElementById(id);
    if (el instanceof HTMLInputElement) el.onkeydown = onEnter;
  }

  const tutorialSubmit = document.getElementById("tutorial-submit");
  if (tutorialSubmit) tutorialSubmit.onclick = () => window.close();

  const autoBtn = document.getElementById("auto-import");
  if (autoBtn) autoBtn.onclick = () => void autoClip();
  const interactiveBtn = document.getElementById("interactive-import");
  if (interactiveBtn) interactiveBtn.onclick = () => void interactiveClip();

  const token = await getToken();
  showOnly(token ? "start" : "login");
};

document.addEventListener("DOMContentLoaded", () => void wireUp());
