import { Injectable, PLATFORM_ID, inject } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { UserService } from "./user.service";
import { UtilService } from "./util.service";

const CAPABILITY_RETRY_RATE = 5000;

@Injectable({
  providedIn: "root",
})
export class CapabilitiesService {
  private userService = inject(UserService);
  private utilService = inject(UtilService);
  private platformId = inject(PLATFORM_ID);

  retryTimeout: any;

  capabilities = {
    highResImages: false,
    multipleImages: false,
    expandablePreviews: false,
    assistantMoreMessages: false,
    moreUsageCredits: false,
  };

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;
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

    const response = await this.userService.capabilities();
    if (!response.success && response.status === 401) return;
    if (!response.success) return this.retry();

    this.capabilities = response.data;
  }
}
