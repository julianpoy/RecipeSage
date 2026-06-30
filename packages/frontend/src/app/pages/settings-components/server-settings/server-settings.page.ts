import { Component, inject } from "@angular/core";
import { NavController } from "@ionic/angular/standalone";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonButton,
  IonItem,
  IonIcon,
  IonLabel,
} from "@ionic/angular/standalone";
import { warningOutline } from "ionicons/icons";
import { addIcons } from "ionicons";

import { RouteMap } from "../../../services/util.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { TextInputComponent } from "../../../components/forms/text-input/text-input.component";
import {
  getApiHostOverride,
  setApiHostOverride,
  isServerOverrideAvailable,
  isValidServerBaseUrl,
} from "../../../utils/apiHostOverride";

@Component({
  standalone: true,
  selector: "page-server-settings",
  templateUrl: "server-settings.page.html",
  styleUrls: ["server-settings.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonButton,
    IonItem,
    IonIcon,
    IonLabel,
    TextInputComponent,
  ],
})
export class ServerSettingsPage {
  private navCtrl = inject(NavController);

  baseUrl = getApiHostOverride() || "";
  invalid = false;
  unlocked = false;

  constructor() {
    addIcons({ warningOutline });
  }

  unlock() {
    this.unlocked = true;
  }

  ionViewWillEnter() {
    if (!isServerOverrideAvailable()) {
      this.navCtrl.navigateBack(RouteMap.SettingsPage.getPath());
    }
  }

  save() {
    const trimmed = this.baseUrl.trim();

    if (trimmed && !isValidServerBaseUrl(trimmed)) {
      this.invalid = true;
      return;
    }

    this.invalid = false;
    setApiHostOverride(trimmed || null);
    window.location.reload();
  }

  reset() {
    setApiHostOverride(null);
    window.location.reload();
  }
}
