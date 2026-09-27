import { Component, inject } from "@angular/core";
import {
  NavController,
  AlertController,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonButton,
  IonLabel,
  IonSegment,
  IonSegmentButton,
} from "@ionic/angular/standalone";
import { serverOutline, warningOutline } from "ionicons/icons";
import { addIcons } from "ionicons";
import { TranslateService } from "@ngx-translate/core";

import { RouteMap } from "../../../services/util.service";
import {
  FeatureFlagKeys,
  FeatureFlagService,
} from "../../../services/feature-flag.service";
import { LogoutService } from "../../../services/logout.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { InfoBlockComponent } from "../../../components/info-block/info-block.component";
import { TextInputComponent } from "../../../components/forms/text-input/text-input.component";
import {
  DEFAULT_API_BASE_URL,
  DEFAULT_GRIP_WS_URL,
} from "../../../../environments/environment";
import {
  serverConfig,
  canCustomizeServerUrls,
  canCustomizeWebBase,
  BETA_API_BASE_URL,
  BETA_GRIP_WS_BASE,
  SERVER_PRESET_STORAGE_KEY,
  CUSTOM_API_BASE_URL_KEY,
  CUSTOM_GRIP_WS_URL_KEY,
  CUSTOM_WEB_BASE_URL_KEY,
} from "../../../utils/serverConfig";

type SelectablePreset = "default" | "beta" | "custom";

interface ServerTarget {
  apiBase: string;
  gripWsBase: string;
  webBase: string | null;
}

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
    IonLabel,
    IonSegment,
    IonSegmentButton,
    InfoBlockComponent,
    TextInputComponent,
  ],
})
export class ServerSettingsPage {
  private navCtrl = inject(NavController);
  private alertCtrl = inject(AlertController);
  private translate = inject(TranslateService);
  private logoutService = inject(LogoutService);
  private featureFlagService = inject(FeatureFlagService);

  unlocked = false;
  showBeta =
    this.featureFlagService.flags[FeatureFlagKeys.EnableBetaServerPreset];

  preset: SelectablePreset =
    serverConfig.preset === "beta" || serverConfig.preset === "custom"
      ? serverConfig.preset
      : "default";

  apiBase = serverConfig.preset === "custom" ? serverConfig.apiBase : "";
  gripWsBase = serverConfig.preset === "custom" ? serverConfig.gripWsBase : "";
  webBase = serverConfig.preset === "custom" ? serverConfig.webBase : "";

  canCustomizeWebBase = canCustomizeWebBase;

  apiBaseInvalid = false;
  gripWsInvalid = false;
  webBaseInvalid = false;

  constructor() {
    addIcons({ serverOutline, warningOutline });
  }

  ionViewWillEnter() {
    if (!canCustomizeServerUrls) {
      this.navCtrl.navigateBack(RouteMap.SettingsPage.getPath());
    }
  }

  unlock() {
    this.unlocked = true;
  }

  onPresetChange() {
    this.apiBaseInvalid = false;
    this.gripWsInvalid = false;
    this.webBaseInvalid = false;
  }

  get previewApiBase(): string {
    switch (this.preset) {
      case "beta":
        return BETA_API_BASE_URL;
      case "custom":
        return this.resolveApiBase() || "";
      default:
        return DEFAULT_API_BASE_URL;
    }
  }

  private validateUrl(value: string, protocols: string[]): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;

    try {
      const parsed = new URL(trimmed);
      if (!protocols.includes(parsed.protocol)) return null;
    } catch {
      return null;
    }

    return trimmed;
  }

  private resolveApiBase(): string | null {
    const value = this.validateUrl(this.apiBase, ["http:", "https:"]);
    if (!value) return null;

    return value.endsWith("/") ? value : `${value}/`;
  }

  private resolveWebBase(): string | null {
    const value = this.validateUrl(this.webBase, ["http:", "https:"]);
    if (!value) return null;

    const parsed = new URL(value);
    if (parsed.pathname !== "/" || parsed.search || parsed.hash) return null;

    return parsed.origin;
  }

  private resolveTarget(): ServerTarget | null {
    switch (this.preset) {
      case "beta":
        return {
          apiBase: BETA_API_BASE_URL,
          gripWsBase: BETA_GRIP_WS_BASE,
          webBase: null,
        };
      case "custom": {
        const apiBase = this.resolveApiBase();
        const gripWsBase = this.validateUrl(this.gripWsBase, ["ws:", "wss:"]);
        const webBase = canCustomizeWebBase ? this.resolveWebBase() : null;

        this.apiBaseInvalid = !apiBase;
        this.gripWsInvalid = !gripWsBase;
        this.webBaseInvalid = canCustomizeWebBase && !webBase;
        if (!apiBase || !gripWsBase || this.webBaseInvalid) return null;

        return { apiBase, gripWsBase, webBase };
      }
      default:
        return {
          apiBase: DEFAULT_API_BASE_URL,
          gripWsBase: DEFAULT_GRIP_WS_URL,
          webBase: null,
        };
    }
  }

  async save() {
    const target = this.resolveTarget();
    if (!target) return;

    const customPresetChanged =
      (this.preset === "custom") !== (serverConfig.preset === "custom");
    const serverChanged =
      customPresetChanged ||
      target.apiBase !== serverConfig.apiBase ||
      target.gripWsBase !== serverConfig.gripWsBase;

    if (!serverChanged) {
      if (target.webBase && target.webBase !== serverConfig.webBase) {
        localStorage.setItem(CUSTOM_WEB_BASE_URL_KEY, target.webBase);
        window.location.reload();
        return;
      }

      this.navCtrl.navigateBack(RouteMap.SettingsPage.getPath());
      return;
    }

    const header = await this.translate
      .get("pages.serverSettings.switchConfirm.header")
      .toPromise();
    const message = await this.translate
      .get("pages.serverSettings.switchConfirm.message")
      .toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();
    const confirm = await this.translate
      .get("pages.serverSettings.switchConfirm.confirm")
      .toPromise();

    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: cancel,
          role: "cancel",
        },
        {
          text: confirm,
          role: "destructive",
          handler: () => {
            this.applyServerChange(target);
          },
        },
      ],
    });

    await alert.present();
  }

  private async applyServerChange(target: ServerTarget) {
    if (this.preset === "custom") {
      localStorage.setItem(SERVER_PRESET_STORAGE_KEY, "custom");
      localStorage.setItem(CUSTOM_API_BASE_URL_KEY, target.apiBase);
      localStorage.setItem(CUSTOM_GRIP_WS_URL_KEY, target.gripWsBase);
      if (target.webBase) {
        localStorage.setItem(CUSTOM_WEB_BASE_URL_KEY, target.webBase);
      } else {
        localStorage.removeItem(CUSTOM_WEB_BASE_URL_KEY);
      }
    } else {
      localStorage.setItem(SERVER_PRESET_STORAGE_KEY, this.preset);
    }

    await this.logoutService.logout();
    window.location.reload();
  }
}
