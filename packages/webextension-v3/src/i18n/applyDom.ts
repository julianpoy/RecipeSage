import { getActiveLanguage, t } from "./t";
import { isRtl } from "./language";

export const applyI18nToDom = (root: ParentNode = document): void => {
  for (const el of Array.from(
    root.querySelectorAll<HTMLElement>("[data-i18n]"),
  )) {
    const key = el.dataset.i18n;
    if (!key) continue;
    el.textContent = t(key);
  }
  for (const el of Array.from(
    root.querySelectorAll<HTMLElement>("[data-i18n-placeholder]"),
  )) {
    const key = el.dataset.i18nPlaceholder;
    if (!key) continue;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.placeholder = t(key);
    }
  }
  for (const el of Array.from(
    root.querySelectorAll<HTMLElement>("[data-i18n-title]"),
  )) {
    const key = el.dataset.i18nTitle;
    if (!key) continue;
    el.title = t(key);
  }
  for (const el of Array.from(
    root.querySelectorAll<HTMLElement>("[data-i18n-aria-label]"),
  )) {
    const key = el.dataset.i18nAriaLabel;
    if (!key) continue;
    el.setAttribute("aria-label", t(key));
  }

  const lang = getActiveLanguage();
  document.documentElement.lang = lang;
  document.documentElement.dir = isRtl(lang) ? "rtl" : "ltr";
};
