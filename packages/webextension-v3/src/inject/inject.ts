import { ClipError } from "../api/clip";
import type { ClipResult } from "../api/clip";
import { MissingTitleError, NotLoggedInError } from "../api/saveRecipe";
import { clipFromHtmlViaBg, saveRecipeViaBg } from "../api/clipBridge";
import {
  ExtensionPreferences,
  getPreferences,
  getToken,
  setPreferences,
  setToken,
} from "../api/storage";
import { getEffectiveBases } from "../config";

const EXTENSION_CONTAINER_ID = "recipeSageBrowserExtensionRootContainer";

const MOVE_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10 9h4V6h3l-5-5-5 5h3v3zm-1 1H6V7l-5 5 5 5v-3h3v-4zm14 2l-5-5v3h-3v4h3v3l5-5zm-9 3h-4v3H7l5 5 5-5h-3v-3z"/></svg>`;
const CUT_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm0 12c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm6-7.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5zM19 3l-6 6 2 2 7-7V3z"/></svg>`;

interface ExtensionWindow extends Window {
  [EXTENSION_CONTAINER_ID]?: boolean;
  recipeSageBrowserExtensionRootTrigger?: () => void;
}

const w: ExtensionWindow = window;

if (w[EXTENSION_CONTAINER_ID]) {
  try {
    w.recipeSageBrowserExtensionRootTrigger?.();
  } catch {
    // Do nothing
  }
} else {
  w[EXTENSION_CONTAINER_ID] = true;
  console.log("Loading RecipeSage Browser Extension");

  void bootstrap();
}

async function bootstrap() {
  const shadowRootContainer = document.createElement("div");
  shadowRootContainer.id = EXTENSION_CONTAINER_ID;
  const shadowRoot = shadowRootContainer.attachShadow({ mode: "closed" });
  document.body.appendChild(shadowRootContainer);

  const styles = document.createElement("link");
  styles.href = chrome.runtime.getURL("inject/clipTool.css");
  styles.rel = "stylesheet";
  styles.type = "text/css";
  shadowRoot.appendChild(styles);

  const preferences = await getPreferences();
  const token = await getToken();
  const { webBase } = await getEffectiveBases();

  let autoSnipPendingContainer: HTMLDivElement | undefined;
  let autoSnipPromise: Promise<ClipResult | undefined> =
    Promise.resolve(undefined);

  if (!preferences.disableAutoSnip) {
    autoSnipPendingContainer = document.createElement("div");
    autoSnipPendingContainer.className = "rs-autoSnipPendingContainer";
    shadowRoot.appendChild(autoSnipPendingContainer);

    const autoSnipPending = document.createElement("div");
    autoSnipPending.className = "autoSnipPending";
    autoSnipPending.innerText = "Grabbing Recipe Content...";
    autoSnipPendingContainer.appendChild(autoSnipPending);

    autoSnipPromise = autoSnipFromPage(token);
  }

  const autoSnipResults = (await autoSnipPromise) ?? {};
  if (autoSnipPendingContainer) {
    setTimeout(() => {
      autoSnipPendingContainer?.remove();
    }, 250);
  }

  initEditor(shadowRoot, preferences, autoSnipResults, webBase);
}

async function autoSnipFromPage(
  token: string | undefined,
): Promise<ClipResult | undefined> {
  if (!token) {
    window.alert(
      "Please login. Click the RecipeSage icon to log in, then try again.",
    );
    return undefined;
  }
  try {
    return await clipFromHtmlViaBg(document.documentElement.outerHTML);
  } catch (e) {
    if (e instanceof ClipError && e.status === 401) {
      await setToken(null);
      window.alert(
        "Please login. It looks like you're logged out. Please close and re-open the clip tool to login.",
      );
      return undefined;
    }
    if (e instanceof ClipError && e.status === 429) {
      window.alert(
        "Daily limit reached for clipping. Cooking credits reset at 0:00 GMT. Consider contributing for a larger daily allowance.",
      );
      return undefined;
    }
    console.error(e);
    window.alert(
      "Error while attempting to automatically clip recipe from page",
    );
    return undefined;
  }
}

interface CurrentSnip extends ClipResult {
  url: string;
}

type AlertContext = {
  shadowRootContainer?: HTMLDivElement;
  container?: HTMLDivElement;
  timeout?: ReturnType<typeof setTimeout>;
};

function initEditor(
  shadowRoot: ShadowRoot,
  preferences: ExtensionPreferences,
  autoSnipResults: ClipResult,
  webBase: string,
) {
  const currentSnip: CurrentSnip = {
    url: window.location.href,
    ...(preferences.disableAutoSnip ? {} : autoSnipResults),
  };
  let isDirty = false;
  let imageURLInput: HTMLInputElement | undefined;
  let container: HTMLDivElement | undefined;
  const pos = { lastX: 0, lastY: 0 };
  const alertCtx: AlertContext = {};

  const setField = <K extends keyof CurrentSnip>(
    field: K,
    val: CurrentSnip[K],
  ) => {
    currentSnip[field] = val;
    isDirty = true;
  };

  const snip = (
    field: keyof CurrentSnip,
    formatCb?: (selectedText: string) => string,
  ): string => {
    let selectedText = window.getSelection()?.toString() ?? "";
    if (formatCb) selectedText = formatCb(selectedText);
    setField(field, selectedText);
    return selectedText;
  };

  const hide = () => {
    isDirty = false;
    if (container) container.style.display = "none";
  };

  const show = () => {
    if (!container) build();
    setTimeout(() => {
      if (container) container.style.display = "block";
    });
  };

  const moveTo = (top: number, left: number) => {
    if (!container) return;
    if (left < 0) {
      container.style.left = "0px";
    } else if (left + container.offsetWidth > window.innerWidth) {
      container.style.left = `${window.innerWidth - container.offsetWidth}px`;
    } else {
      container.style.left = `${left}px`;
    }

    if (top < 0) {
      container.style.top = "0px";
    } else if (top + container.offsetHeight > window.innerHeight) {
      container.style.top = `${window.innerHeight - container.offsetHeight}px`;
    } else {
      container.style.top = `${top}px`;
    }
  };

  const moveDrag = (e: MouseEvent) => {
    if (!container) return;
    const diffX = e.clientX - pos.lastX;
    const diffY = e.clientY - pos.lastY;
    moveTo(container.offsetTop + diffY, container.offsetLeft + diffX);
    pos.lastX = e.clientX;
    pos.lastY = e.clientY;
  };

  const stopDrag = () => {
    window.removeEventListener("mouseup", stopDrag);
    window.removeEventListener("mousemove", moveDrag);
  };

  const startDrag = (e: MouseEvent) => {
    window.addEventListener("mouseup", stopDrag);
    window.addEventListener("mousemove", moveDrag);
    pos.lastX = e.clientX;
    pos.lastY = e.clientY;
  };

  const onResize = () => {
    if (container) moveTo(container.offsetTop, container.offsetLeft);
  };

  const build = () => {
    container = document.createElement("div");
    container.className = "rs-chrome-container";
    container.style.display = "none";
    container.onmousedown = startDrag;
    window.addEventListener("resize", onResize);
    shadowRoot.appendChild(container);

    const headline = document.createElement("div");
    headline.className = "headline";
    container.appendChild(headline);

    const leftHeadline = document.createElement("div");
    leftHeadline.className = "headline-left";
    headline.appendChild(leftHeadline);

    const moveHandle = document.createElement("span");
    moveHandle.className = "move-handle";
    moveHandle.innerHTML = MOVE_ICON_SVG;
    leftHeadline.appendChild(moveHandle);

    const logoLink = document.createElement("a");
    logoLink.href = "https://recipesage.com";
    logoLink.target = "_blank";
    logoLink.onmousedown = (e) => e.stopPropagation();
    leftHeadline.appendChild(logoLink);

    const logo = document.createElement("img");
    logo.src = chrome.runtime.getURL("images/recipesage-black-trimmed.png");
    logo.className = "logo";
    logo.draggable = false;
    logoLink.appendChild(logo);

    const closeButton = document.createElement("button");
    closeButton.innerText = "CLOSE";
    closeButton.onclick = hide;
    closeButton.onmousedown = (e) => e.stopPropagation();
    closeButton.className = "close clear";
    headline.appendChild(closeButton);

    const tipContainer = document.createElement("div");
    tipContainer.className = "tip";
    tipContainer.onmousedown = (e) => e.stopPropagation();
    container.appendChild(tipContainer);

    const tipText = document.createElement("a");
    tipText.innerText = "Open Tutorial";
    tipText.href = "https://docs.recipesage.com";
    tipText.target = "_blank";
    tipContainer.appendChild(tipText);

    const preferencesContainer = document.createElement("div");
    preferencesContainer.className = "preferences-container";
    tipContainer.appendChild(preferencesContainer);

    const autoSnipToggle = document.createElement("input");
    autoSnipToggle.className = "enable-autosnip";
    autoSnipToggle.checked = !preferences.disableAutoSnip;
    autoSnipToggle.type = "checkbox";
    autoSnipToggle.onchange = () => {
      void (async () => {
        const next = {
          ...preferences,
          disableAutoSnip: !autoSnipToggle.checked,
        };
        await setPreferences(next);
        displayAlert(
          "Preferences saved!",
          "Please reload the page for these changes to take effect",
          4000,
        );
      })();
    };
    preferencesContainer.appendChild(autoSnipToggle);

    const autoSnipToggleLabel = document.createElement("span");
    autoSnipToggleLabel.innerText = "Enable Auto Field Detection";
    autoSnipToggleLabel.className = "enable-autosnip-label";
    preferencesContainer.appendChild(autoSnipToggleLabel);

    const imageField = createSnipper(
      "Image URL",
      "imageURL",
      false,
      currentSnip.imageURL,
      true,
    ).input;
    if (!(imageField instanceof HTMLInputElement)) {
      throw new Error("imageURL field must be an input");
    }
    imageURLInput = imageField;
    createSnipper("Title", "title", false, currentSnip.title);
    createSnipper("Description", "description", false, currentSnip.description);
    createSnipper("Yield", "yield", false, currentSnip.yield);
    createSnipper("Active Time", "activeTime", false, currentSnip.activeTime);
    createSnipper("Total Time", "totalTime", false, currentSnip.totalTime);
    createSnipper("Source", "source", false, currentSnip.source);
    createSnipper("Source URL", "url", false, currentSnip.url, true);
    createSnipper("Ingredients", "ingredients", true, currentSnip.ingredients);
    createSnipper(
      "Instructions",
      "instructions",
      true,
      currentSnip.instructions,
    );
    createSnipper("Notes", "notes", true, currentSnip.notes);

    const save = document.createElement("button");
    save.innerText = "Save";
    save.onclick = () => void submit();
    save.onmousedown = (e) => e.stopPropagation();
    save.className = "save";
    container.appendChild(save);

    window.addEventListener("beforeunload", (e) => {
      if (!isDirty) return undefined;
      const confirmationMessage = `You've made changes in the RecipeSage editor. If you leave before saving, your changes will be lost.`;
      e.returnValue = confirmationMessage;
      return confirmationMessage;
    });
  };

  const createSnipper = (
    title: string,
    field: keyof CurrentSnip,
    isTextArea: boolean,
    initialValue?: string,
    disableSnip = false,
    formatCb?: (text: string) => string,
  ) => {
    if (!container) throw new Error("createSnipper called before build()");

    const label = document.createElement("label");
    label.onmousedown = (e) => e.stopPropagation();
    container.appendChild(label);

    const input: HTMLInputElement | HTMLTextAreaElement = isTextArea
      ? document.createElement("textarea")
      : document.createElement("input");

    if (!disableSnip) {
      const button = document.createElement("button");
      button.className = "icon-button";
      button.onclick = () => {
        input.value = snip(field, formatCb);
      };

      const iconWrapper = document.createElement("span");
      iconWrapper.className = "icon";
      iconWrapper.innerHTML = CUT_ICON_SVG;
      button.appendChild(iconWrapper);
      label.appendChild(button);
    }

    input.placeholder = title;
    if (initialValue) {
      input.value = isTextArea
        ? initialValue
        : initialValue.replace(/\n/g, " ");
    }
    input.oninput = () => {
      setField(field, input.value);
    };
    label.appendChild(input);

    return { input, label };
  };

  const initAlert = () => {
    alertCtx.shadowRootContainer = document.createElement("div");
    const inner = alertCtx.shadowRootContainer.attachShadow({ mode: "closed" });
    document.body.appendChild(alertCtx.shadowRootContainer);

    const alertStyles = document.createElement("link");
    alertStyles.href = chrome.runtime.getURL("inject/alert.css");
    alertStyles.rel = "stylesheet";
    alertStyles.type = "text/css";
    inner.appendChild(alertStyles);

    alertCtx.container = document.createElement("div");
    alertCtx.container.className = "alert";
    inner.appendChild(alertCtx.container);
  };

  const destroyAlert = () => {
    if (alertCtx.shadowRootContainer) {
      alertCtx.shadowRootContainer.remove();
    }
    alertCtx.shadowRootContainer = undefined;
    alertCtx.container = undefined;
  };

  const displayAlert = (
    title: string,
    body: string,
    hideAfter?: number,
    bodyLink?: string,
  ) => {
    destroyAlert();
    initAlert();
    if (!alertCtx.container) return;

    const headline = document.createElement("div");
    headline.className = "headline";
    alertCtx.container.appendChild(headline);

    const alertImg = document.createElement("img");
    alertImg.src = chrome.runtime.getURL("icons/android-chrome-512x512.png");
    headline.appendChild(alertImg);

    const alertTitle = document.createElement("h3");
    alertTitle.innerText = title;
    headline.appendChild(alertTitle);

    const alertBody = document.createElement("span");
    if (bodyLink) {
      const alertBodyLink = document.createElement("a");
      alertBodyLink.target = "_blank";
      alertBodyLink.href = bodyLink;
      alertBodyLink.innerText = body;
      alertBody.appendChild(alertBodyLink);
    } else {
      alertBody.innerText = body;
    }
    alertCtx.container.appendChild(alertBody);

    setTimeout(() => {
      if (alertCtx.container) alertCtx.container.style.display = "block";
      if (alertCtx.timeout) clearTimeout(alertCtx.timeout);
      alertCtx.timeout = setTimeout(() => destroyAlert(), hideAfter ?? 6000);
    });
  };

  const submit = async () => {
    const token = await getToken();
    if (!token) {
      displayAlert(
        "Please Login",
        "It looks like you're logged out. Please click the RecipeSage icon to login again.",
        4000,
      );
      return;
    }

    try {
      const saved = await saveRecipeViaBg(currentSnip);
      hide();
      displayAlert(
        "Recipe Saved!",
        "Click to open",
        4000,
        `${webBase}/app/recipe/${saved.id}`,
      );
    } catch (e) {
      if (e instanceof NotLoggedInError) {
        await setToken(null);
        displayAlert(
          "Please Login",
          "It looks like you're logged out. Please click the RecipeSage icon to login again.",
          4000,
        );
        return;
      }
      if (e instanceof MissingTitleError) {
        displayAlert(
          "Could Not Save Recipe",
          "A recipe title is required.",
          4000,
        );
        return;
      }
      console.error(e);
      displayAlert(
        "Could Not Save Recipe",
        "An error occurred while saving the recipe. Please try again.",
        4000,
      );
    }
  };

  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "show") show();
    if (request.action === "hide") hide();
    if (request.action === "snipImage" && imageURLInput) {
      show();
      imageURLInput.value = request.event.srcUrl;
      setField("imageURL", request.event.srcUrl);
    }
  });

  w.recipeSageBrowserExtensionRootTrigger = show;
  show();
}
