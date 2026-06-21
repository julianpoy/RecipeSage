import { Injectable, inject } from "@angular/core";
import { ServerActionsService } from "./server-actions.service";
import type { RouterOutputs } from "./server-actions/actions-base";
import { UtilService } from "./util.service";

const CAPABILITY_RETRY_RATE = 5000;

@Injectable({
  providedIn: "root",
})
export class CapabilitiesService {
  private serverActionsService = inject(ServerActionsService);
  private utilService = inject(UtilService);

  retryTimeout?: ReturnType<typeof setTimeout>;

  capabilities: RouterOutputs["users"]["getMyCapabilities"] = {
    highResImages: false,
    multipleImages: false,
    expandablePreviews: false,
    assistantMoreMessages: false,
    moreUsageCredits: false,
  };

  constructor() {
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
    if (!this.utilService.isLoggedIn()) return this.retry();

    const response = await this.serverActionsService.users.getMyCapabilities({
      401: () => {},
    });
    if (!response) return this.retry();

    this.capabilities = response;
  }
}
