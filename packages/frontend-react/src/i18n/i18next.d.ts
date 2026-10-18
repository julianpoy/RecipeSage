import "i18next";
import type enUS from "@recipesage/frontend/src/assets/i18n/en-us.json";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    keySeparator: false;
    nsSeparator: false;
    returnNull: false;
    resources: {
      translation: typeof enUS;
    };
  }
}
