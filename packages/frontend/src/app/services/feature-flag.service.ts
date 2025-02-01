import { Injectable } from "@angular/core";
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

  constructor() {}

  private isHost(host: string | string[]) {
    if (typeof host === "object") {
      return host.includes(window.location.hostname);
    }

    return window.location.hostname === host;
  }
}
