import {
  GlobalPreferenceKey,
  OfflineModePromptOptions,
} from "@recipesage/util/shared";

import { preferencesStore } from "../stores/preferencesStore";
import { syncService } from "./syncService";
import { offlineModeState } from "./offlineModeState";
import { EventName, events } from "./events";
import { appIdbStorageManager } from "../utils/appIdbStorageManager";
import { i18n } from "../i18n/i18n";
import { showAlert } from "../components/dialogs/showAlert";

const OFFLINE_MODE_DOCS_URL =
  "https://docs.recipesage.com/docs/tutorials/settings/settings#enable-offline-mode";

class OfflineModeService {
  private promptedThisSession = false;
  private isPromptOpen = false;
  private isBlockedAlertOpen = false;

  constructor() {
    offlineModeState.registerHooks({
      notifySlowRead: () => void this.promptSlowRead(),
      showBlockedError: () => void this.presentBlocked(),
      notifyEnabledChanged: () =>
        events.publish(EventName.ApplicationOfflineModeChanged),
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
      void syncService.syncAll();
    }
  }

  private async presentEnabledInfo(): Promise<void> {
    await showAlert({
      header: i18n.t("offlineMode.enabled.header"),
      message: i18n.t("offlineMode.enabled.message"),
      preline: true,
      buttons: [
        {
          text: i18n.t("generic.moreInfo"),
          handler: () => {
            window.open(OFFLINE_MODE_DOCS_URL, "_blank", 'rel="noopener"');
          },
        },
        {
          text: i18n.t("generic.close"),
          role: "cancel",
        },
      ],
    });
  }

  private async presentSyncRequired(): Promise<void> {
    await showAlert({
      header: i18n.t("offlineMode.syncRequired.header"),
      message: i18n.t("offlineMode.syncRequired.message"),
      preline: true,
      buttons: [
        {
          text: i18n.t("generic.okay"),
          role: "cancel",
        },
      ],
    });
  }

  private async promptSlowRead(): Promise<void> {
    if (offlineModeState.enabled) return;
    if (this.promptedThisSession) return;
    if (this.isPromptOpen) return;
    if (
      preferencesStore.getState().preferences[
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
      await showAlert({
        header: i18n.t("offlineMode.prompt.header"),
        message: i18n.t("offlineMode.prompt.message"),
        preline: true,
        buttons: [
          {
            text: i18n.t("offlineMode.prompt.neverAsk"),
            variant: "ghost",
            handler: () => {
              preferencesStore
                .getState()
                .setPreference(
                  GlobalPreferenceKey.OfflineModePrompt,
                  OfflineModePromptOptions.Never,
                );
            },
          },
          {
            text: i18n.t("offlineMode.prompt.notNow"),
            role: "cancel",
          },
          {
            text: i18n.t("offlineMode.prompt.enable"),
            handler: () => {
              offlineModeState.enable();
            },
          },
        ],
      });
    } finally {
      this.isPromptOpen = false;
    }
  }

  private async presentBlocked(): Promise<void> {
    if (this.isBlockedAlertOpen) return;
    this.isBlockedAlertOpen = true;

    try {
      await showAlert({
        header: i18n.t("offlineMode.blocked.header"),
        message: i18n.t("offlineMode.blocked.message"),
        buttons: [
          {
            text: i18n.t("generic.okay"),
            role: "cancel",
          },
        ],
      });
    } finally {
      this.isBlockedAlertOpen = false;
    }
  }
}

export const offlineModeService = new OfflineModeService();
