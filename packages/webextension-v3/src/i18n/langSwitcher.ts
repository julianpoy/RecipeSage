import { SupportedLanguages } from "@recipesage/util/shared";
import {
  ALL_LANGUAGES,
  getStoredLanguagePreference,
  setLanguageOverride,
} from "./language";
import { applyI18nToDom } from "./applyDom";
import { getActiveLanguage, reloadI18n, t } from "./t";
import { LANGUAGE_NAVIGATOR } from "../api/storage";

const LANG_SWITCHER_SELECTOR = "details.lang-switcher";

const getLanguageDisplayName = (lang: SupportedLanguages): string => {
  try {
    const names = new Intl.DisplayNames(lang, {
      type: "language",
      fallback: "code",
    });
    return names.of(lang) || lang;
  } catch {
    return lang;
  }
};

interface SwitcherOptions {
  onChange?: () => void | Promise<void>;
}

const buildMenuItems = async (
  menu: HTMLUListElement,
  options: SwitcherOptions,
): Promise<void> => {
  menu.replaceChildren();

  const storedPref = await getStoredLanguagePreference();
  const activeLang = getActiveLanguage();
  const usingNavigator =
    storedPref === undefined || storedPref === LANGUAGE_NAVIGATOR;

  const navigatorLi = document.createElement("li");
  navigatorLi.setAttribute("role", "none");
  const navigatorBtn = document.createElement("button");
  navigatorBtn.type = "button";
  navigatorBtn.setAttribute("role", "menuitem");
  navigatorBtn.textContent = t("webextension.action.languageDefault");
  navigatorBtn.dataset.lang = LANGUAGE_NAVIGATOR;
  if (usingNavigator) navigatorBtn.setAttribute("aria-current", "true");
  navigatorLi.appendChild(navigatorBtn);
  menu.appendChild(navigatorLi);

  const langs = ALL_LANGUAGES.slice().sort((a, b) =>
    getLanguageDisplayName(a).localeCompare(getLanguageDisplayName(b)),
  );

  for (const lang of langs) {
    const li = document.createElement("li");
    li.setAttribute("role", "none");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("role", "menuitem");
    btn.dataset.lang = lang;
    btn.textContent = getLanguageDisplayName(lang);
    btn.setAttribute("hreflang", lang);
    if (!usingNavigator && lang === activeLang) {
      btn.setAttribute("aria-current", "true");
    }
    li.appendChild(btn);
    menu.appendChild(li);
  }

  menu.addEventListener("click", async (e) => {
    const target = e.target;
    if (!(target instanceof HTMLButtonElement)) return;
    const lang = target.dataset.lang;
    if (!lang) return;

    const details = menu.closest<HTMLDetailsElement>(LANG_SWITCHER_SELECTOR);
    if (details) details.open = false;

    if (lang === LANGUAGE_NAVIGATOR) {
      await setLanguageOverride(null);
    } else {
      await setLanguageOverride(lang as SupportedLanguages);
    }
    await reloadI18n();
    applyI18nToDom();
    updateCurrentLabel();
    await buildMenuItems(menu, options);
    if (options.onChange) await options.onChange();
  });
};

const updateCurrentLabel = (): void => {
  const labelEl = document.getElementById("lang-current");
  if (!labelEl) return;
  labelEl.textContent = getLanguageDisplayName(getActiveLanguage());
};

const closeAll = (): void => {
  document
    .querySelectorAll<HTMLDetailsElement>(`${LANG_SWITCHER_SELECTOR}[open]`)
    .forEach((d) => {
      d.open = false;
    });
};

let outsideHandlersAttached = false;

const attachOutsideHandlers = (): void => {
  if (outsideHandlersAttached) return;
  outsideHandlersAttached = true;

  document.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof Node)) return;
    document
      .querySelectorAll<HTMLDetailsElement>(`${LANG_SWITCHER_SELECTOR}[open]`)
      .forEach((d) => {
        if (!d.contains(target)) d.open = false;
      });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const open = document.querySelector<HTMLDetailsElement>(
      `${LANG_SWITCHER_SELECTOR}[open]`,
    );
    if (!open) return;
    closeAll();
    open.querySelector<HTMLElement>("summary")?.focus();
  });
};

export const initLangSwitcher = async (
  options: SwitcherOptions = {},
): Promise<void> => {
  const details = document.querySelector<HTMLDetailsElement>(
    LANG_SWITCHER_SELECTOR,
  );
  if (!details) return;
  const menu = details.querySelector<HTMLUListElement>("ul.lang-menu");
  if (!menu) return;

  await buildMenuItems(menu, options);
  updateCurrentLabel();

  const summary = details.querySelector<HTMLElement>("summary");
  if (summary) {
    summary.setAttribute("aria-expanded", details.open ? "true" : "false");
    details.addEventListener("toggle", () => {
      summary.setAttribute("aria-expanded", details.open ? "true" : "false");
    });
  }

  attachOutsideHandlers();
};
