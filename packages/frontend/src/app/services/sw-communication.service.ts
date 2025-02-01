import { Injectable } from "@angular/core";

import { SW_BROADCAST_CHANNEL_NAME } from "../utils/SW_BROADCAST_CHANNEL_NAME";

const broadcastChannel = new BroadcastChannel(SW_BROADCAST_CHANNEL_NAME);

@Injectable({
  providedIn: "root",
})
export class SwCommunicationService {
  async triggerFullCacheSync() {
    broadcastChannel.postMessage({
      type: "triggerFullSync",
    });
  }
}
