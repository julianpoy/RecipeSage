import { Component, DestroyRef, inject, signal } from "@angular/core";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonContent,
  IonItem,
  IonIcon,
  IonLabel,
  IonAccordion,
  IonAccordionGroup,
} from "@ionic/angular/standalone";
import {
  chevronForwardOutline,
  cloudDownloadOutline,
  desktopOutline,
  downloadOutline,
  extensionPuzzleOutline,
  bookmarkOutline,
  logoAndroid,
  logoApple,
  logoTux,
  logoWindows,
  shareOutline,
} from "ionicons/icons";
import { addIcons } from "ionicons";
import {
  DESKTOP_DOWNLOADS,
  DESKTOP_PLATFORMS,
  DESKTOP_PLATFORM_BUTTON_LABEL_KEYS,
  DESKTOP_PLATFORM_LABEL_KEYS,
  DESKTOP_RECOMMENDED_DOWNLOADS,
  detectDesktopPlatform,
  getDesktopDownloadUrl,
  type DesktopPlatform,
} from "@recipesage/util/shared";
import { IS_DESKTOP } from "../../../../environments/environment";
import {
  clearInstallPrompt,
  getInstallPrompt,
} from "../../../utils/pwaInstallPrompt";

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
    IonItem,
    IonIcon,
    IonLabel,
    IonAccordion,
    IonAccordionGroup,
  ],
})
export class DownloadAndInstallPage {
  private destroyRef = inject(DestroyRef);

  isDesktopApp = IS_DESKTOP;
  platforms = DESKTOP_PLATFORMS;
  downloads = DESKTOP_DOWNLOADS;
  recommendedDownloads = DESKTOP_RECOMMENDED_DOWNLOADS;
  platformLabelKeys = DESKTOP_PLATFORM_LABEL_KEYS;
  platformButtonLabelKeys = DESKTOP_PLATFORM_BUTTON_LABEL_KEYS;
  platformIcons: Record<DesktopPlatform, string> = {
    windows: "logo-windows",
    macos: "logo-apple",
    linux: "logo-tux",
  };
  recommendedPlatform = detectDesktopPlatform(navigator.userAgent);

  pwaPromptAvailable = signal(!!getInstallPrompt());

  downloadUrl = getDesktopDownloadUrl;

  constructor() {
    addIcons({
      chevronForwardOutline,
      cloudDownloadOutline,
      desktopOutline,
      downloadOutline,
      extensionPuzzleOutline,
      bookmarkOutline,
      logoAndroid,
      logoApple,
      logoTux,
      logoWindows,
      shareOutline,
    });

    const onInstallPrompt = () => this.pwaPromptAvailable.set(true);
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    this.destroyRef.onDestroy(() =>
      window.removeEventListener("beforeinstallprompt", onInstallPrompt),
    );
  }

  async showPWAPrompt() {
    const installPrompt = getInstallPrompt();
    if (!installPrompt) return;

    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;

    if (outcome === "accepted") {
      clearInstallPrompt();
      this.pwaPromptAvailable.set(false);
    }
  }
}
