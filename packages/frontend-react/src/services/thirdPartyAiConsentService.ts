import { Capacitor } from "@capacitor/core";
import { i18n } from "../i18n/i18n";
import { showAlert } from "../components/dialogs/showAlert";
import { navigation } from "../routes/navigation";

const THIRD_PARTY_AI_CONSENT_LOCALSTORAGE_KEY = "thirdPartyAiConsentGranted";

export const thirdPartyAiConsentService = {
  async ensureConsent(): Promise<boolean> {
    if (Capacitor.getPlatform() !== "ios") return true;
    if (localStorage.getItem(THIRD_PARTY_AI_CONSENT_LOCALSTORAGE_KEY)) {
      return true;
    }

    const { role } = await showAlert({
      header: i18n.t("services.thirdPartyAiConsent.header"),
      message: i18n.t("services.thirdPartyAiConsent.message"),
      buttons: [
        {
          text: i18n.t("services.thirdPartyAiConsent.privacyPolicy"),
          role: "privacyPolicy",
          variant: "ghost",
        },
        {
          text: i18n.t("services.thirdPartyAiConsent.deny"),
          role: "cancel",
        },
        {
          text: i18n.t("services.thirdPartyAiConsent.allow"),
          role: "confirm",
        },
      ],
    });

    if (role === "privacyPolicy") {
      navigation.navigateToHref("/legal");
      return false;
    }
    if (role !== "confirm") return false;

    localStorage.setItem(THIRD_PARTY_AI_CONSENT_LOCALSTORAGE_KEY, "true");
    return true;
  },
};
