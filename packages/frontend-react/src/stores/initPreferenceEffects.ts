import {
  type AppPreferenceTypes,
  type AppTheme,
  GlobalPreferenceKey,
} from "@recipesage/util/shared";
import { preferencesStore } from "./preferencesStore";
import { i18n } from "../i18n/i18n";
import { getAppBrowserLang } from "../i18n/getAppBrowserLang";

export const getPreferredLanguage = (preferences: AppPreferenceTypes) =>
  preferences[GlobalPreferenceKey.Language] || getAppBrowserLang();

const applyTheme = (theme: AppTheme) => {
  const classList = document.documentElement.classList;
  for (const className of [...classList]) {
    if (className.startsWith("theme-")) classList.remove(className);
  }
  classList.add(`theme-${theme}`);
};

const applyPreferences = (
  preferences: AppPreferenceTypes,
  previousPreferences?: AppPreferenceTypes,
) => {
  const fontSize = preferences[GlobalPreferenceKey.FontSize];
  if (fontSize !== previousPreferences?.[GlobalPreferenceKey.FontSize]) {
    document.documentElement.style.fontSize = fontSize;
  }

  const theme = preferences[GlobalPreferenceKey.Theme];
  if (theme !== previousPreferences?.[GlobalPreferenceKey.Theme]) {
    applyTheme(theme);
  }

  if (!previousPreferences) return;

  const language = getPreferredLanguage(preferences);
  if (language !== getPreferredLanguage(previousPreferences)) {
    void i18n.changeLanguage(language);
  }
};

export const initPreferenceEffects = () => {
  applyPreferences(preferencesStore.getState().preferences);

  preferencesStore.subscribe((state, previousState) => {
    applyPreferences(state.preferences, previousState.preferences);
  });
};
