import { Injectable, PLATFORM_ID, REQUEST, inject } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { IS_SELFHOST } from "../../environments/environment";

export enum FeatureFlagKeys {
  EnableAssistant = "enableAssistant",
  EnableContribution = "enableContribution",
  EnableInstallInstructions = "enableInstallInstructions",
}

export interface FeatureFlagTypes {
  [FeatureFlagKeys.EnableAssistant]: boolean;
  [FeatureFlagKeys.EnableContribution]: boolean;
  [FeatureFlagKeys.EnableInstallInstructions]: boolean;
}

@Injectable({
  providedIn: "root",
})
export class FeatureFlagService {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private request = inject(REQUEST, { optional: true });

  flags = {
    [FeatureFlagKeys.EnableAssistant]: true,
    [FeatureFlagKeys.EnableContribution]:
      !IS_SELFHOST &&
      !this.isHost(["ios.recipesage.com", "android.recipesage.com"]),
    [FeatureFlagKeys.EnableInstallInstructions]: !this.isHost([
      "windows.recipesage.com",
      "ios.recipesage.com",
      "android.recipesage.com",
    ]),
  } satisfies Record<FeatureFlagKeys, boolean>;

  private currentHostname(): string | null {
    if (this.isBrowser) return window.location.hostname;
    const url = this.request?.url;
    if (!url) return null;
    try {
      return new URL(url).hostname;
    } catch {
      return null;
    }
  }

  private isHost(host: string | string[]) {
    const hostname = this.currentHostname();
    if (!hostname) return false;
    if (Array.isArray(host)) return host.includes(hostname);
    return hostname === host;
  }
}
