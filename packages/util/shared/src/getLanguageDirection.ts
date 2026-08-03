import { SupportedLanguages } from "./preferences";

const RTL_LANGUAGES: string[] = [
  SupportedLanguages.HE,
  SupportedLanguages.AR_SA,
];

export const getLanguageDirection = (language: string): "ltr" | "rtl" =>
  RTL_LANGUAGES.includes(language) ? "rtl" : "ltr";
