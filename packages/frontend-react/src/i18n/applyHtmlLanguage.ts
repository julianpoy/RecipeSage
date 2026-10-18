import { SupportedLanguages } from "@recipesage/util/shared";

const rtlLanguages: string[] = [
  SupportedLanguages.HE,
  SupportedLanguages.AR_SA,
];

export const isRtlLanguage = (lang: string) => rtlLanguages.includes(lang);

export const applyHtmlLanguage = (lang: string) => {
  document.documentElement.lang = lang;
  document.documentElement.dir = isRtlLanguage(lang) ? "rtl" : "ltr";
};
