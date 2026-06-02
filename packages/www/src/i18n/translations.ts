import type { SupportedLanguages } from '@recipesage/util/shared';

export const DEFAULT_LOCALE = "en-us";

export const LOCALE_NAMES: Record<string, string> = {
  "en-us": "English",
  "ar-sa": "العربية",
  cs: "Čeština",
  "da-dk": "Dansk",
  "de-de": "Deutsch",
  el: "Ελληνικά",
  "es-es": "Español (España)",
  "es-mx": "Español (México)",
  eu: "Euskara",
  fi: "Suomi",
  "fr-fr": "Français",
  he: "עברית",
  hi: "हिन्दी",
  "hu-hu": "Magyar",
  "it-it": "Italiano",
  ja: "日本語",
  ko: "한국어",
  lt: "Lietuvių",
  "nb-no": "Norsk bokmål",
  nl: "Nederlands",
  pl: "Polski",
  "pt-br": "Português (Brasil)",
  "pt-pt": "Português (Portugal)",
  ro: "Română",
  "ru-ru": "Русский",
  sv: "Svenska",
  tr: "Türkçe",
  "uk-ua": "Українська",
  "zh-cn": "中文 (简体)",
  "zh-hant": "中文 (繁體)",
} satisfies Record<SupportedLanguages, string>;

const i18nModules = import.meta.glob<Record<string, string>>(
  "../../../frontend/src/assets/i18n/*.json",
  { eager: true, import: "default" },
);

const i18nByLocale: Record<string, Record<string, string>> = {};
for (const [path, dict] of Object.entries(i18nModules)) {
  const match = path.match(/\/([^/]+)\.json$/);
  if (!match) continue;
  i18nByLocale[match[1]] = dict;
}

export const SUPPORTED_LOCALES = Object.keys(i18nByLocale).sort();

const WWW_REQUIRED_KEYS = [
  "pages.welcome.title",
  "pages.welcome.subtitle",
  "pages.welcome.description.1",
  "pages.about.title",
  "pages.pricing.title",
];

export const WWW_SUPPORTED_LOCALES = SUPPORTED_LOCALES.filter((loc) =>
  WWW_REQUIRED_KEYS.every((k) => i18nByLocale[loc]?.[k] !== undefined),
);

const RTL_LOCALES = new Set(["he", "ar", "fa", "ur"]);

export function isRtl(locale: string): boolean {
  return RTL_LOCALES.has(locale.split("-")[0]);
}

export function toOgLocale(locale: string): string {
  const parsed = new Intl.Locale(locale);
  return parsed.region
    ? `${parsed.language}_${parsed.region}`
    : parsed.language;
}

export type Translator = (key: string) => string;

export function makeTranslator(locale: string): Translator {
  const dict = i18nByLocale[locale] ?? {};
  const fallback =
    locale === DEFAULT_LOCALE ? null : (i18nByLocale[DEFAULT_LOCALE] ?? null);
  return (key) => dict[key] ?? fallback?.[key] ?? key;
}

export function localePath(locale: string, path: string): string {
  const withSlash = path.endsWith("/") ? path : `${path}/`;
  if (locale === DEFAULT_LOCALE) return withSlash;
  return `/${locale}${withSlash}`;
}

export function toBcp47(locale: string): string {
  return new Intl.Locale(locale).toString();
}
