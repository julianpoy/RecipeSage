import { i18n } from "../i18n/i18n";
import { syncService } from "./syncService";

export const swCommunicationService = {
  async triggerFullCacheSync(notify = false) {
    if (!notify) {
      await syncService.syncAll();
      return;
    }

    await syncService.syncAllAndNotify({
      title: i18n.t("sync.notification.title"),
      body: i18n.t("sync.notification.body"),
    });
  },
};
