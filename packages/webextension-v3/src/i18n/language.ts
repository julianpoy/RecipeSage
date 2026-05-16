import { SupportedLanguages } from "@recipesage/util/shared";
import {
  LANGUAGE_NAVIGATOR,
  type LanguagePreference,
  getPreferences,
} from "../api/storage";

const defaultLocality: Record<string, SupportedLanguages> = {
  en: SupportedLanguages.EN_US,
  it: SupportedLanguages.IT_IT,
  de: SupportedLanguages.DE_DE,
  uk: SupportedLanguages.UK_UA,
  he: SupportedLanguages.HE,
  es: SupportedLanguages.ES_ES,
  fr: SupportedLanguages.FR_FR,
  ru: SupportedLanguages.RU_RU,
  hu: SupportedLanguages.HU_HU,
  da: SupportedLanguages.DA_DK,
  zh: SupportedLanguages.ZH_CN,
  pt: SupportedLanguages.PT_PT,
  nl: SupportedLanguages.NL,
  pl: SupportedLanguages.PL,
  ja: SupportedLanguages.JA,
  lt: SupportedLanguages.LT,
  eu: SupportedLanguages.EU,
  el: SupportedLanguages.EL,
  fi: SupportedLanguages.FI,
  sv: SupportedLanguages.SV,
  ro: SupportedLanguages.RO,
  cs: SupportedLanguages.CS,
  ar: SupportedLanguages.AR_SA,
  hi: SupportedLanguages.HI,
  ko: SupportedLanguages.KO,
  nb: SupportedLanguages.NB_NO,
  tr: SupportedLanguages.TR,
  "zh-tw": SupportedLanguages.ZH_HANT,
  "zh-hk": SupportedLanguages.ZH_HANT,
  "zh-mo": SupportedLanguages.ZH_HANT,
};

const RTL_LANGUAGES: SupportedLanguages[] = [
  SupportedLanguages.HE,
  SupportedLanguages.AR_SA,
];

const isSupported = (lang: string): lang is SupportedLanguages =>
  Object.values(SupportedLanguages).some((el) => el === lang);

const detectBrowserLanguage = (): SupportedLanguages => {
  const raw =
    (typeof chrome !== "undefined" && chrome.i18n?.getUILanguage?.()) ||
    (typeof navigator !== "undefined" && navigator.language) ||
    "";
  const navLang = raw.toLowerCase();
  if (isSupported(navLang)) return navLang;

  const regionDefault = defaultLocality[navLang];
  if (regionDefault) return regionDefault;

  const baseLang = navLang.split("-")[0];
  if (isSupported(baseLang)) return baseLang as SupportedLanguages;

  const baseDefault = defaultLocality[baseLang];
  if (baseDefault) return baseDefault;

  return SupportedLanguages.EN_US;
};

export const getEffectiveLanguage = async (): Promise<SupportedLanguages> => {
  const { language } = await getPreferences();
  if (language && language !== LANGUAGE_NAVIGATOR) return language;
  return detectBrowserLanguage();
};

export const getStoredLanguagePreference = async (): Promise<
  LanguagePreference | undefined
> => {
  const { language } = await getPreferences();
  return language;
};

export const setLanguageOverride = async (
  pref: LanguagePreference | null,
): Promise<void> => {
  if (pref === null) {
    await chrome.storage.local.remove("language");
    return;
  }
  await chrome.storage.local.set({ language: pref });
};

export const isRtl = (lang: SupportedLanguages): boolean =>
  RTL_LANGUAGES.includes(lang);

export const ALL_LANGUAGES: SupportedLanguages[] =
  Object.values(SupportedLanguages);
