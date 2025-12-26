import { Component } from "@angular/core";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";

@Component({
  standalone: true,
  selector: "page-download-and-install",
  templateUrl: "download-and-install.page.html",
  styleUrls: ["download-and-install.page.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class DownloadAndInstallPage {
  showAndroid = false;
  showIOS = false;
  showDesktop = false;

  constructor() {
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
