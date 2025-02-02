import { Injectable } from "@angular/core";

import { SW_BROADCAST_CHANNEL_NAME } from "../utils/SW_BROADCAST_CHANNEL_NAME";
import { TranslateService } from "@ngx-translate/core";

const broadcastChannel = new BroadcastChannel(SW_BROADCAST_CHANNEL_NAME);

@Injectable({
  providedIn: "root",
})
export class SwCommunicationService {
  constructor(private translate: TranslateService) {}

  async triggerFullCacheSync(notify = false) {
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
    broadcastChannel.postMessage({
      type: "triggerFullSync",
      notification,
    });
  }
}
