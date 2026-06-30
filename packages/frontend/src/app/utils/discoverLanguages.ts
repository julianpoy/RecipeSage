import { SupportedLanguages } from "@recipesage/util/shared";

const toIso6391 = (locale: string): string =>
  locale.split("-")[0].toLowerCase();

export interface DiscoverLanguageOption {
  code: string;
  label: string;
}

export const getDiscoverLanguageOptions = (
  displayLocale: string,
): DiscoverLanguageOption[] => {
  const codes = new Set<string>();
  for (const locale of Object.values(SupportedLanguages)) {
    codes.add(toIso6391(locale));
  }

  let displayNames: Intl.DisplayNames | undefined;
  try {
    displayNames = new Intl.DisplayNames([displayLocale], {
      type: "language",
      fallback: "code",
    });
  } catch {
    displayNames = undefined;
  }

  const options: DiscoverLanguageOption[] = [];
  for (const code of codes) {
    let label = code;
    try {
      label = displayNames?.of(code) || code;
    } catch {
      label = code;
    }
    options.push({ code, label });
  }

  return options.sort((a, b) => a.label.localeCompare(b.label));
};

export const getDefaultDiscoverLanguages = (
  currentLocale: string,
): string[] => {
  const english = toIso6391(SupportedLanguages.EN_US);
  const current = toIso6391(currentLocale || SupportedLanguages.EN_US);
  return Array.from(new Set([english, current]));
};

export const localeToDiscoverLanguage = (locale: string): string =>
  toIso6391(locale || SupportedLanguages.EN_US);
