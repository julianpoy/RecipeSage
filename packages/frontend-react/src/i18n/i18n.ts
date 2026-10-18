import i18next, { type BackendModule } from "i18next";
import { initReactI18next } from "react-i18next";
import { SupportedLanguages } from "@recipesage/util/shared";
import { applyHtmlLanguage } from "./applyHtmlLanguage";
import { setLocalDbUpgradeMessages } from "../utils/localDb/localDbUpgradeMessages";

const httpBackend: BackendModule = {
  type: "backend",
  init: () => {},
  read: (language, _namespace, callback) => {
    fetch(`assets/i18n/${language}.json?version=${window.version}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to load language ${language}: ${response.status}`,
          );
        }
        return response.json();
      })
      .then((data) => callback(null, data))
      .catch((error) => callback(error, false));
  },
};

export const i18n = i18next.createInstance();

i18n.use(httpBackend).use(initReactI18next);

i18n.on("languageChanged", (language) => {
  window.currentRSLanguage = language;
  applyHtmlLanguage(language);
  setLocalDbUpgradeMessages({
    confirm: i18n.t("pages.app.localDbUpgrade.confirm"),
    notRefreshed: i18n.t("pages.app.localDbUpgrade.notRefreshed"),
  });
});

export const initI18n = (language: string) =>
  i18n.init({
    lng: language,
    fallbackLng: SupportedLanguages.EN_US,
    load: "currentOnly",
    lowerCaseLng: true,
    keySeparator: false,
    nsSeparator: false,
    returnNull: false,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });
