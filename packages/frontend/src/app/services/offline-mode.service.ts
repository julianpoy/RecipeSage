import { Injectable, inject } from "@angular/core";
import { AlertController } from "@ionic/angular/standalone";
import { TranslateService } from "@ngx-translate/core";
import {
  GlobalPreferenceKey,
  OfflineModePromptOptions,
} from "@recipesage/util/shared";

import { PreferencesService } from "./preferences.service";
import { SyncService } from "./sync.service";
import { offlineModeState } from "./offlineModeState";
import { EventName, EventService } from "./event.service";
import { appIdbStorageManager } from "../utils/appIdbStorageManager";

const OFFLINE_MODE_DOCS_URL =
  "https://docs.recipesage.com/docs/tutorials/settings/settings#enable-offline-mode";

@Injectable({
  providedIn: "root",
})
export class OfflineModeService {
  private preferencesService = inject(PreferencesService);
  private syncService = inject(SyncService);
  private alertCtrl = inject(AlertController);
  private translate = inject(TranslateService);
  private events = inject(EventService);

  private promptedThisSession = false;
  private isPromptOpen = false;
  private isBlockedAlertOpen = false;

  constructor() {
    offlineModeState.registerHooks({
      notifySlowRead: () => void this.promptSlowRead(),
      showBlockedError: () => void this.presentBlocked(),
      notifyEnabledChanged: () =>
        this.events.publish(EventName.ApplicationOfflineModeChanged),
    });
  }

  get enabled(): boolean {
    return offlineModeState.enabled;
  }

  async setEnabled(value: boolean): Promise<void> {
    if (value) {
      const lastSync = await appIdbStorageManager.getLastSync();
      if (!lastSync) {
        await this.presentSyncRequired();
        return;
      }

      offlineModeState.enable();
      await this.presentEnabledInfo();
      return;
    }

    const wasEnabled = offlineModeState.enabled;
    offlineModeState.disable();
    if (wasEnabled) {
      void this.syncService.syncAll();
    }
  }

  private async presentEnabledInfo(): Promise<void> {
    const header = await this.translate
      .get("offlineMode.enabled.header")
      .toPromise();
    const message = await this.translate
      .get("offlineMode.enabled.message")
      .toPromise();
    const moreInfo = await this.translate.get("generic.moreInfo").toPromise();
    const close = await this.translate.get("generic.close").toPromise();

    const alert = await this.alertCtrl.create({
      header,
      message,
      cssClass: "alert-preline",
      buttons: [
        {
          text: moreInfo,
          handler: () => {
            window.open(OFFLINE_MODE_DOCS_URL, "_blank", 'rel="noopener"');
          },
        },
        {
          text: close,
          role: "cancel",
        },
      ],
    });

    await alert.present();
    await alert.onDidDismiss();
  }

  private async presentSyncRequired(): Promise<void> {
    const header = await this.translate
      .get("offlineMode.syncRequired.header")
      .toPromise();
    const message = await this.translate
      .get("offlineMode.syncRequired.message")
      .toPromise();
    const okay = await this.translate.get("generic.okay").toPromise();

    const alert = await this.alertCtrl.create({
      header,
      message,
      cssClass: "alert-preline",
      buttons: [
        {
          text: okay,
          role: "cancel",
        },
      ],
    });

    await alert.present();
    await alert.onDidDismiss();
  }

  private async promptSlowRead(): Promise<void> {
    if (offlineModeState.enabled) return;
    if (this.promptedThisSession) return;
    if (this.isPromptOpen) return;
    if (
      this.preferencesService.preferences[
        GlobalPreferenceKey.OfflineModePrompt
      ] === OfflineModePromptOptions.Never
    ) {
      return;
    }

    const lastSync = await appIdbStorageManager.getLastSync();
    if (!lastSync) return;

    this.promptedThisSession = true;
    this.isPromptOpen = true;

    try {
      const header = await this.translate
        .get("offlineMode.prompt.header")
        .toPromise();
      const message = await this.translate
        .get("offlineMode.prompt.message")
        .toPromise();
      const enable = await this.translate
        .get("offlineMode.prompt.enable")
        .toPromise();
      const notNow = await this.translate
        .get("offlineMode.prompt.notNow")
        .toPromise();
      const neverAsk = await this.translate
        .get("offlineMode.prompt.neverAsk")
        .toPromise();

      const alert = await this.alertCtrl.create({
        header,
        message,
        cssClass: "alert-preline",
        buttons: [
          {
            text: neverAsk,
            handler: () => {
              this.preferencesService.preferences[
                GlobalPreferenceKey.OfflineModePrompt
              ] = OfflineModePromptOptions.Never;
              this.preferencesService.save();
            },
          },
          {
            text: notNow,
            role: "cancel",
          },
          {
            text: enable,
            handler: () => {
              offlineModeState.enable();
            },
          },
        ],
      });

      await alert.present();
      await alert.onDidDismiss();
    } finally {
      this.isPromptOpen = false;
    }
  }

  private async presentBlocked(): Promise<void> {
    if (this.isBlockedAlertOpen) return;
    this.isBlockedAlertOpen = true;

    try {
      const header = await this.translate
        .get("offlineMode.blocked.header")
        .toPromise();
      const message = await this.translate
        .get("offlineMode.blocked.message")
        .toPromise();
      const okay = await this.translate.get("generic.okay").toPromise();

      const alert = await this.alertCtrl.create({
        header,
        message,
        buttons: [
          {
            text: okay,
            role: "cancel",
          },
        ],
      });

      await alert.present();
      await alert.onDidDismiss();
    } finally {
      this.isBlockedAlertOpen = false;
    }
  }
}
