import { Injectable, inject } from "@angular/core";
import { AlertController, NavController } from "@ionic/angular/standalone";
import { TranslateService } from "@ngx-translate/core";
import { Capacitor } from "@capacitor/core";

import { RouteMap } from "./util.service";

const THIRD_PARTY_AI_CONSENT_LOCALSTORAGE_KEY = "thirdPartyAiConsentGranted";

@Injectable({
  providedIn: "root",
})
export class ThirdPartyAiConsentService {
  private alertCtrl = inject(AlertController);
  private navCtrl = inject(NavController);
  private translate = inject(TranslateService);

  async ensureConsent(): Promise<boolean> {
    if (Capacitor.getPlatform() !== "ios") return true;
    if (localStorage.getItem(THIRD_PARTY_AI_CONSENT_LOCALSTORAGE_KEY)) {
      return true;
    }

    const [header, message, privacyPolicy, deny, allow] = await Promise.all([
      this.translate.get("services.thirdPartyAiConsent.header").toPromise(),
      this.translate.get("services.thirdPartyAiConsent.message").toPromise(),
      this.translate
        .get("services.thirdPartyAiConsent.privacyPolicy")
        .toPromise(),
      this.translate.get("services.thirdPartyAiConsent.deny").toPromise(),
      this.translate.get("services.thirdPartyAiConsent.allow").toPromise(),
    ]);

    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: privacyPolicy,
          role: "privacyPolicy",
        },
        {
          text: deny,
          role: "cancel",
        },
        {
          text: allow,
          role: "confirm",
        },
      ],
    });
    await alert.present();

    const { role } = await alert.onDidDismiss();

    if (role === "privacyPolicy") {
      this.navCtrl.navigateForward(RouteMap.LegalPage.getPath());
      return false;
    }

    if (role !== "confirm") return false;

    localStorage.setItem(THIRD_PARTY_AI_CONSENT_LOCALSTORAGE_KEY, "true");
    return true;
  }
}
