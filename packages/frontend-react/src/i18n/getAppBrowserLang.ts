import { SupportedLanguages } from "@recipesage/util/shared";

// This can be used for fallback when a non-localized language is requested
// and we only have localized versions
const defaultLocality: Record<string, SupportedLanguages | undefined> = {
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

const isSupported = (lang: string | undefined): lang is SupportedLanguages =>
  Object.values(SupportedLanguages).some((el) => el === lang);

export const getAppBrowserLang = (): SupportedLanguages => {
  // Navigator language can be in the form 'en', or 'en-us' for any given language
  const navLang = window.navigator.language.toLowerCase();
  const navLangNoRegion = navLang.split("-")[0];

  // We always prefer to return the exact language the navigator requested if we have it
  if (isSupported(navLang)) return navLang;

  // Look for a region-specific default mapping (e.g. zh-tw -> zh-hant)
  const regionDefault = defaultLocality[navLang];
  if (isSupported(regionDefault)) return regionDefault;

  // Look for a language with no locality ('en')
  if (isSupported(navLangNoRegion)) return navLangNoRegion;

  // Look for a language with a locality we have a 'default locality' mapping for as a last resort
  const baseDefault = defaultLocality[navLangNoRegion];
  if (isSupported(baseDefault)) return baseDefault;

  return SupportedLanguages.EN_US;
};
