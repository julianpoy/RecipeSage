import { Component, inject, ChangeDetectionStrategy } from "@angular/core";
import { Router } from "@angular/router";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { Capacitor } from "@capacitor/core";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonBackButton,
  IonTitle,
  IonContent,
  IonItem,
  IonIcon,
  IonLabel,
  IonAccordion,
  IonAccordionGroup,
} from "@ionic/angular";
import {
  desktopOutline,
  downloadOutline,
  extensionPuzzleOutline,
  bookmarkOutline,
  logoApple,
  logoTux,
  logoWindows,
  phonePortraitOutline,
} from "ionicons/icons";
import { addIcons } from "ionicons";
import {
  DESKTOP_DOWNLOADS,
  DESKTOP_PLATFORMS,
  DESKTOP_PLATFORM_BUTTON_LABEL_KEYS,
  DESKTOP_PLATFORM_LABEL_KEYS,
  DESKTOP_RECOMMENDED_DOWNLOADS,
  detectDesktopPlatform,
  getAppStoreBadgeUrl,
  getDesktopDownloadUrl,
  getGooglePlayBadgeUrl,
  MOBILE_APP_STORE_URLS,
  type DesktopPlatform,
} from "@recipesage/util/shared";
import { IS_DESKTOP } from "../../../../environments/environment";
import { CopyWithWebshareComponent } from "../../../components/copy-with-webshare/copy-with-webshare.component";
import { RouteMap, UtilService } from "../../../services/util.service";

@Component({
  standalone: true,
  selector: "page-download-and-install",
  templateUrl: "download-and-install.page.html",
  styleUrls: ["download-and-install.page.scss"],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    ...SHARED_UI_IMPORTS,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonBackButton,
    IonTitle,
    IonContent,
    IonItem,
    IonIcon,
    IonLabel,
    IonAccordion,
    IonAccordionGroup,
    CopyWithWebshareComponent,
  ],
})
export class DownloadAndInstallPage {
  private router = inject(Router);
  private utilService = inject(UtilService);

  showBack = false;
  defaultBackHref: string = RouteMap.MorePage.getPath();

  isNativeOrDesktopApp = Capacitor.isNativePlatform() || IS_DESKTOP;
  downloadPageUrl = "https://recipesage.com/download";
  mobileAppStoreUrls = MOBILE_APP_STORE_URLS;
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

  downloadUrl = getDesktopDownloadUrl;

  constructor() {
    addIcons({
      desktopOutline,
      downloadOutline,
      extensionPuzzleOutline,
      bookmarkOutline,
      logoApple,
      logoTux,
      logoWindows,
      phonePortraitOutline,
    });

    if (this.router.currentNavigation()?.extras.state?.showBack) {
      this.showBack = true;
    }
  }

  get appStoreBadgeUrl() {
    return getAppStoreBadgeUrl(this.utilService.getCurrentLocale());
  }

  get googlePlayBadgeUrl() {
    return getGooglePlayBadgeUrl(this.utilService.getCurrentLocale());
  }
}
