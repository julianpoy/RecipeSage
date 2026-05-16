import { ClipError } from "../api/clip";
import type { ClipResult } from "../api/clip";
import { MissingTitleError, NotLoggedInError } from "../api/saveRecipe";
import type { Nutrition, NutritionFields } from "../api/saveRecipe";
import {
  clipFromHtmlViaBg,
  getNutritionFromTextViaBg,
  saveRecipeViaBg,
} from "../api/clipBridge";
import {
  ExtensionPreferences,
  getPreferences,
  getToken,
  setToken,
} from "../api/storage";
import { getEffectiveBases } from "../config";

const EXTENSION_CONTAINER_ID = "recipeSageBrowserExtensionRootContainer";

const MOVE_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10 9h4V6h3l-5-5-5 5h3v3zm-1 1H6V7l-5 5 5 5v-3h3v-4zm14 2l-5-5v3h-3v4h3v3l5-5zm-9 3h-4v3H7l5 5 5-5h-3v-3z"/></svg>`;

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

  const autoSnipPendingContainer = document.createElement("div");
  autoSnipPendingContainer.className = "rs-autoSnipPendingContainer";
  shadowRoot.appendChild(autoSnipPendingContainer);

  const autoSnipPending = document.createElement("div");
  autoSnipPending.className = "autoSnipPending";
  autoSnipPending.innerText = "Grabbing Recipe Content...";
  autoSnipPendingContainer.appendChild(autoSnipPending);

  const autoSnipResults = (await autoSnipFromPage(token)) ?? {};

  setTimeout(() => {
    autoSnipPendingContainer.remove();
  }, 250);

  const wantsNutrition = preferences.autoClipNutrition !== false;
  const nutritionPromise: Promise<Nutrition | undefined> = (async () => {
    const text = autoSnipResults.nutritionInfo?.trim();
    if (!wantsNutrition || !text) return undefined;
    try {
      return await getNutritionFromTextViaBg(text);
    } catch (e) {
      console.warn("Failed to parse nutrition from clip text", e);
      return undefined;
    }
  })();

  initEditor(
    shadowRoot,
    preferences,
    autoSnipResults,
    webBase,
    nutritionPromise,
  );
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

interface CurrentSnip extends ClipResult, NutritionFields {
  url: string;
}

type AlertContext = {
  shadowRootContainer?: HTMLDivElement;
  container?: HTMLDivElement;
  timeout?: ReturnType<typeof setTimeout>;
};

type StringFieldKey = {
  [K in keyof CurrentSnip]-?: NonNullable<CurrentSnip[K]> extends string
    ? K
    : never;
}[keyof CurrentSnip];

type NumberFieldKey = {
  [K in keyof CurrentSnip]-?: NonNullable<CurrentSnip[K]> extends number
    ? K
    : never;
}[keyof CurrentSnip];

interface NutritionStringSpec {
  kind: "string";
  field: StringFieldKey & keyof NutritionFields;
  title: string;
  textArea?: boolean;
}

interface NutritionNumberSpec {
  kind: "number";
  field: NumberFieldKey & keyof NutritionFields;
  title: string;
}

type NutritionFieldSpec = NutritionStringSpec | NutritionNumberSpec;

const NUTRITION_FIELDS: NutritionFieldSpec[] = [
  { kind: "string", field: "nutritionServingSize", title: "Serving Size" },
  { kind: "number", field: "nutritionCalories", title: "Calories (kcal)" },
  { kind: "number", field: "nutritionTotalFat", title: "Total Fat (g)" },
  {
    kind: "number",
    field: "nutritionSaturatedFat",
    title: "Saturated Fat (g)",
  },
  { kind: "number", field: "nutritionTransFat", title: "Trans Fat (g)" },
  {
    kind: "number",
    field: "nutritionPolyunsaturatedFat",
    title: "Polyunsaturated Fat (g)",
  },
  {
    kind: "number",
    field: "nutritionMonounsaturatedFat",
    title: "Monounsaturated Fat (g)",
  },
  { kind: "number", field: "nutritionCholesterol", title: "Cholesterol (mg)" },
  { kind: "number", field: "nutritionSodium", title: "Sodium (mg)" },
  {
    kind: "number",
    field: "nutritionTotalCarbs",
    title: "Total Carbohydrates (g)",
  },
  {
    kind: "number",
    field: "nutritionDietaryFiber",
    title: "Dietary Fiber (g)",
  },
  { kind: "number", field: "nutritionTotalSugars", title: "Total Sugars (g)" },
  { kind: "number", field: "nutritionAddedSugars", title: "Added Sugars (g)" },
  { kind: "number", field: "nutritionProtein", title: "Protein (g)" },
  { kind: "number", field: "nutritionVitaminD", title: "Vitamin D (mcg)" },
  { kind: "number", field: "nutritionCalcium", title: "Calcium (mg)" },
  { kind: "number", field: "nutritionIron", title: "Iron (mg)" },
  { kind: "number", field: "nutritionPotassium", title: "Potassium (mg)" },
  {
    kind: "string",
    field: "nutritionOtherDetails",
    title: "Other Nutrition Details",
    textArea: true,
  },
];

function initEditor(
  shadowRoot: ShadowRoot,
  _preferences: ExtensionPreferences,
  autoSnipResults: ClipResult,
  webBase: string,
  nutritionPromise: Promise<Nutrition | undefined>,
) {
  const currentSnip: CurrentSnip = {
    url: window.location.href,
    ...autoSnipResults,
  };
  let isDirty = false;
  let imageURLInput: HTMLInputElement | undefined;
  let container: HTMLDivElement | undefined;
  const pos = { lastX: 0, lastY: 0 };
  const alertCtx: AlertContext = {};
  const nutritionInputs = new Map<
    keyof NutritionFields,
    HTMLInputElement | HTMLTextAreaElement
  >();

  const markDirty = () => {
    isDirty = true;
  };

  const setStringField = (field: StringFieldKey, val: string) => {
    currentSnip[field] = val;
    markDirty();
  };

  const setNumberField = (field: NumberFieldKey, val: number | null) => {
    currentSnip[field] = val;
    markDirty();
  };

  const applyNutrition = (n: Nutrition) => {
    currentSnip.nutritionServingSize = n.servingSize;
    currentSnip.nutritionCalories = n.calories;
    currentSnip.nutritionTotalFat = n.totalFat;
    currentSnip.nutritionSaturatedFat = n.saturatedFat;
    currentSnip.nutritionTransFat = n.transFat;
    currentSnip.nutritionPolyunsaturatedFat = n.polyunsaturatedFat;
    currentSnip.nutritionMonounsaturatedFat = n.monounsaturatedFat;
    currentSnip.nutritionCholesterol = n.cholesterol;
    currentSnip.nutritionSodium = n.sodium;
    currentSnip.nutritionTotalCarbs = n.totalCarbs;
    currentSnip.nutritionDietaryFiber = n.dietaryFiber;
    currentSnip.nutritionTotalSugars = n.totalSugars;
    currentSnip.nutritionAddedSugars = n.addedSugars;
    currentSnip.nutritionProtein = n.protein;
    currentSnip.nutritionVitaminD = n.vitaminD;
    currentSnip.nutritionCalcium = n.calcium;
    currentSnip.nutritionIron = n.iron;
    currentSnip.nutritionPotassium = n.potassium;

    for (const spec of NUTRITION_FIELDS) {
      const input = nutritionInputs.get(spec.field);
      if (!input) continue;
      const value = currentSnip[spec.field];
      if (value === null || value === undefined) {
        input.value = "";
      } else {
        input.value = String(value);
      }
    }
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

    const imageField = createStringField({
      title: "Image URL",
      field: "imageURL",
      initialValue: currentSnip.imageURL,
    });
    if (!(imageField.input instanceof HTMLInputElement)) {
      throw new Error("imageURL field must be an input");
    }
    imageURLInput = imageField.input;
    createStringField({
      title: "Title",
      field: "title",
      initialValue: currentSnip.title,
    });
    createStringField({
      title: "Description",
      field: "description",
      initialValue: currentSnip.description,
    });
    createStringField({
      title: "Yield",
      field: "yield",
      initialValue: currentSnip.yield,
    });
    createStringField({
      title: "Active Time",
      field: "activeTime",
      initialValue: currentSnip.activeTime,
    });
    createStringField({
      title: "Total Time",
      field: "totalTime",
      initialValue: currentSnip.totalTime,
    });
    createStringField({
      title: "Source",
      field: "source",
      initialValue: currentSnip.source,
    });
    createStringField({
      title: "Source URL",
      field: "url",
      initialValue: currentSnip.url,
    });
    createStringField({
      title: "Ingredients",
      field: "ingredients",
      initialValue: currentSnip.ingredients,
      textArea: true,
    });
    createStringField({
      title: "Instructions",
      field: "instructions",
      initialValue: currentSnip.instructions,
      textArea: true,
    });
    createStringField({
      title: "Notes",
      field: "notes",
      initialValue: currentSnip.notes,
      textArea: true,
    });

    buildNutritionSection();

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

  const createFieldDom = (
    title: string,
    textArea: boolean,
    parent: HTMLElement,
  ): {
    label: HTMLLabelElement;
    input: HTMLInputElement | HTMLTextAreaElement;
  } => {
    const label = document.createElement("label");
    label.className = "field";
    label.onmousedown = (e) => e.stopPropagation();
    parent.appendChild(label);

    const fieldName = document.createElement("span");
    fieldName.className = "field-name";
    fieldName.innerText = title;
    label.appendChild(fieldName);

    const input: HTMLInputElement | HTMLTextAreaElement = textArea
      ? document.createElement("textarea")
      : document.createElement("input");
    input.placeholder = title;
    label.appendChild(input);

    return { label, input };
  };

  const createStringField = (opts: {
    title: string;
    field: StringFieldKey;
    initialValue?: string | null;
    textArea?: boolean;
    parent?: HTMLElement;
  }): {
    input: HTMLInputElement | HTMLTextAreaElement;
    label: HTMLLabelElement;
  } => {
    const parent = opts.parent ?? container;
    if (!parent) throw new Error("createStringField called before build()");

    const { label, input } = createFieldDom(
      opts.title,
      !!opts.textArea,
      parent,
    );

    if (opts.initialValue !== undefined && opts.initialValue !== null) {
      input.value = opts.textArea
        ? opts.initialValue
        : opts.initialValue.replace(/\n/g, " ");
    }

    input.oninput = () => {
      setStringField(opts.field, input.value);
    };

    return { input, label };
  };

  const createNumberField = (opts: {
    title: string;
    field: NumberFieldKey;
    initialValue?: number | null;
    parent?: HTMLElement;
  }): { input: HTMLInputElement; label: HTMLLabelElement } => {
    const parent = opts.parent ?? container;
    if (!parent) throw new Error("createNumberField called before build()");

    const { label, input } = createFieldDom(opts.title, false, parent);
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("createFieldDom returned non-input for number field");
    }
    input.inputMode = "decimal";

    if (opts.initialValue !== undefined && opts.initialValue !== null) {
      input.value = String(opts.initialValue);
    }

    input.oninput = () => {
      if (input.value === "") {
        setNumberField(opts.field, null);
        return;
      }
      const parsed = parseFloat(input.value);
      setNumberField(opts.field, Number.isFinite(parsed) ? parsed : null);
    };

    return { input, label };
  };

  const buildNutritionSection = () => {
    if (!container) return;

    const section = document.createElement("div");
    section.className = "nutrition-section";
    container.appendChild(section);

    const header = document.createElement("button");
    header.type = "button";
    header.className = "nutrition-header";
    header.onmousedown = (e) => e.stopPropagation();
    section.appendChild(header);

    const caret = document.createElement("span");
    caret.className = "nutrition-caret";
    caret.innerText = "▶";
    header.appendChild(caret);

    const headerText = document.createElement("span");
    headerText.innerText = "Nutrition (per serving)";
    header.appendChild(headerText);

    const body = document.createElement("div");
    body.className = "nutrition-body";
    body.style.display = "none";
    section.appendChild(body);

    let open = false;
    header.onclick = () => {
      open = !open;
      body.style.display = open ? "block" : "none";
      section.classList.toggle("open", open);
    };

    for (const spec of NUTRITION_FIELDS) {
      if (spec.kind === "string") {
        const initial = currentSnip[spec.field];
        const { input } = createStringField({
          title: spec.title,
          field: spec.field,
          initialValue: initial,
          textArea: spec.textArea,
          parent: body,
        });
        nutritionInputs.set(spec.field, input);
      } else {
        const initial = currentSnip[spec.field];
        const { input } = createNumberField({
          title: spec.title,
          field: spec.field,
          initialValue: initial,
          parent: body,
        });
        nutritionInputs.set(spec.field, input);
      }
    }
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
      setStringField("imageURL", request.event.srcUrl);
    }
  });

  w.recipeSageBrowserExtensionRootTrigger = show;
  show();

  void nutritionPromise.then((nutrition) => {
    if (nutrition) applyNutrition(nutrition);
  });
}
