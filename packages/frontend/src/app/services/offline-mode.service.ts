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

  setEnabled(value: boolean): void {
    const wasEnabled = offlineModeState.enabled;
    offlineModeState.setEnabled(value);
    if (wasEnabled && !value) {
      void this.syncService.syncAll();
    }
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
