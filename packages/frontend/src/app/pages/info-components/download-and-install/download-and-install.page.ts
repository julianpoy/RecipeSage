import { Component } from "@angular/core";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonIcon,
  IonLabel,
} from "@ionic/angular/standalone";
import {
  cloudDownloadOutline,
  ellipsisVerticalOutline,
  laptopOutline,
  phonePortraitOutline,
  shareOutline,
} from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "page-download-and-install",
  templateUrl: "download-and-install.page.html",
  styleUrls: ["download-and-install.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonIcon,
    IonLabel,
  ],
})
export class DownloadAndInstallPage {
  showAndroid = false;
  showIOS = false;
  showDesktop = false;

  constructor() {
    addIcons({
      cloudDownloadOutline,
      ellipsisVerticalOutline,
      laptopOutline,
      phonePortraitOutline,
      shareOutline,
    });
    const wind = window as any;
    if (wind.pwaPromptInterval) clearInterval(wind.pwaPromptInterval);
    wind.pwaPromptInterval = setInterval(() => {
      this.pwaPromptCapable();
    }, 500);
  }

  toggleAndroid() {
    this.showAndroid = !this.showAndroid;
  }

  toggleIOS() {
    this.showIOS = !this.showIOS;
  }

  toggleDesktop() {
    this.showDesktop = !this.showDesktop;
  }

  pwaPromptCapable() {
    return !!(window as any).deferredInstallPrompt;
  }

  showPWAPrompt() {
    const installPrompt = (window as any).deferredInstallPrompt;
    if (installPrompt) {
      installPrompt.prompt();

      installPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === "accepted") {
          console.log("User accepted the A2HS prompt");
          (window as any).deferredInstallPrompt = null;
        } else {
          console.log("User dismissed the A2HS prompt");
        }
      });
    }
  }
}
