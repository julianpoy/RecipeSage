import { Injectable, inject } from "@angular/core";
import { ServerActionsService } from "./server-actions.service";
import type { RouterOutputs } from "./server-actions/actions-base";
import { EventName, EventService } from "./event.service";
import { UtilService } from "./util.service";

const CAPABILITY_RETRY_RATE = 5000;

const DEFAULT_CAPABILITIES: RouterOutputs["users"]["getMyCapabilities"] = {
  highResImages: false,
  multipleImages: false,
  expandablePreviews: false,
  assistantMoreMessages: false,
  moreUsageCredits: false,
  discoverPublish: false,
};

@Injectable({
  providedIn: "root",
})
export class CapabilitiesService {
  private serverActionsService = inject(ServerActionsService);
  private events = inject(EventService);
  private utilService = inject(UtilService);

  retryTimeout?: ReturnType<typeof setTimeout>;

  capabilities: RouterOutputs["users"]["getMyCapabilities"] = {
    ...DEFAULT_CAPABILITIES,
  };

  constructor() {
    this.events.subscribe(EventName.Auth, () => {
      this.updateCapabilities();
    });

    this.updateCapabilities();
  }

  retry() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    this.retryTimeout = setTimeout(() => {
      this.updateCapabilities();
    }, CAPABILITY_RETRY_RATE);
  }

  async updateCapabilities() {
    if (!this.utilService.isLoggedIn()) {
      this.capabilities = { ...DEFAULT_CAPABILITIES };
      this.events.publish(EventName.CapabilitiesUpdated);
      return;
    }

    const response = await this.serverActionsService.users.getMyCapabilities({
      401: () => {},
    });
    if (!response) return this.retry();

    this.capabilities = response;
    this.events.publish(EventName.CapabilitiesUpdated);
  }
}
