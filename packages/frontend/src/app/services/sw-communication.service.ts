import { Injectable, PLATFORM_ID, inject } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";

import { SW_BROADCAST_CHANNEL_NAME } from "../utils/SW_BROADCAST_CHANNEL_NAME";
import { TranslateService } from "@ngx-translate/core";

@Injectable({
  providedIn: "root",
})
export class SwCommunicationService {
  private translate = inject(TranslateService);
  private platformId = inject(PLATFORM_ID);
  private broadcastChannel: BroadcastChannel | null = isPlatformBrowser(
    this.platformId,
  )
    ? new BroadcastChannel(SW_BROADCAST_CHANNEL_NAME)
    : null;

  async triggerFullCacheSync(notify = false) {
    if (!this.broadcastChannel) return;

    let notification:
      | {
          title: string;
          tag: string | undefined;
          body: string;
        }
      | undefined = undefined;

    const title = await this.translate
      .get("sync.notification.title")
      .toPromise();
    const body = await this.translate.get("sync.notification.body").toPromise();

    if (notify) {
      notification = {
        title,
        body,
        tag: undefined,
      };
    }
    this.broadcastChannel.postMessage({
      type: "triggerFullSync",
      notification,
    });
  }
}
