import { Injectable } from "@angular/core";
import { IS_SELFHOST } from "../../environments/environment";
import { canCustomizeServerUrls } from "../utils/serverConfig";

export enum FeatureFlagKeys {
  EnableContribution = "enableContribution",
  EnableInstallInstructions = "enableInstallInstructions",
  EnableDiscover = "enableDiscover",
  EnableServerSettings = "enableServerSettings",
  EnableBetaServerPreset = "enableBetaServerPreset",
}

export interface FeatureFlagTypes {
  [FeatureFlagKeys.EnableContribution]: boolean;
  [FeatureFlagKeys.EnableInstallInstructions]: boolean;
  [FeatureFlagKeys.EnableDiscover]: boolean;
  [FeatureFlagKeys.EnableServerSettings]: boolean;
  [FeatureFlagKeys.EnableBetaServerPreset]: boolean;
}

@Injectable({
  providedIn: "root",
})
export class FeatureFlagService {
  flags = {
    [FeatureFlagKeys.EnableContribution]:
      !IS_SELFHOST &&
      !this.isHost(["ios.recipesage.com", "android.recipesage.com"]),
    [FeatureFlagKeys.EnableInstallInstructions]: !this.isHost([
      "windows.recipesage.com",
      "ios.recipesage.com",
      "android.recipesage.com",
    ]),
    [FeatureFlagKeys.EnableDiscover]: !IS_SELFHOST,
    [FeatureFlagKeys.EnableServerSettings]: canCustomizeServerUrls,
    [FeatureFlagKeys.EnableBetaServerPreset]:
      !IS_SELFHOST && !this.isHost("beta.recipesage.com"),
  } satisfies Record<FeatureFlagKeys, boolean>;

  constructor() {}

  private isHost(host: string | string[]) {
    if (typeof host === "object") {
      return host.includes(window.location.hostname);
    }

    return window.location.hostname === host;
  }
}
