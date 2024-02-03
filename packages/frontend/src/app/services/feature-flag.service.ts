import { Injectable } from "@angular/core";
import { IS_SELFHOST, environment } from "../../environments/environment";

export enum FeatureFlagKeys {
  EnableExperimentalOfflineCache = "enableExperimentalOfflineCache",
  EnableAssistant = "enableAssistant",
  EnableOCR = "enableOCR",
  EnableContribution = "enableContribution",
  EnableInstallInstructions = "enableInstallInstructions",
}

export interface FeatureFlagTypes {
  [FeatureFlagKeys.EnableExperimentalOfflineCache]: boolean;
  [FeatureFlagKeys.EnableAssistant]: boolean;
  [FeatureFlagKeys.EnableContribution]: boolean;
  [FeatureFlagKeys.EnableInstallInstructions]: boolean;
}

@Injectable({
  providedIn: "root",
})
export class FeatureFlagService {
  flags = {
    [FeatureFlagKeys.EnableExperimentalOfflineCache]:
      this.isHost("beta.recipesage.com") || !environment.production,
    [FeatureFlagKeys.EnableAssistant]:
      this.isHost("beta.recipesage.com") || !environment.production,
    [FeatureFlagKeys.EnableOCR]: !IS_SELFHOST, // This would require both Google certs and an OpenAI key, which selfhost doesn't have at the moment
    [FeatureFlagKeys.EnableContribution]: !this.isHost([
      "ios.recipesage.com",
      "android.recipesage.com",
    ]),
    [FeatureFlagKeys.EnableInstallInstructions]: !this.isHost([
      "windows.recipesage.com",
      "ios.recipesage.com",
      "android.recipesage.com",
    ]),
  };

  constructor() {}

  private isHost(host: string | string[]) {
    if (typeof host === "object") {
      return host.includes(window.location.hostname);
    }

    return window.location.hostname === host;
  }
}
