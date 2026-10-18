import { IS_SELFHOST } from "../environments/environment";
import { canCustomizeServerUrls } from "../utils/serverConfig";

export enum FeatureFlagKeys {
  EnableContribution = "enableContribution",
  EnableInstallInstructions = "enableInstallInstructions",
  EnableDiscover = "enableDiscover",
  EnableServerSettings = "enableServerSettings",
  EnableBetaServerPreset = "enableBetaServerPreset",
}

const isHost = (host: string | string[]) => {
  if (typeof host === "object") {
    return host.includes(window.location.hostname);
  }

  return window.location.hostname === host;
};

export const featureFlags = {
  [FeatureFlagKeys.EnableContribution]:
    !IS_SELFHOST && !isHost(["ios.recipesage.com", "android.recipesage.com"]),
  [FeatureFlagKeys.EnableInstallInstructions]: !isHost([
    "windows.recipesage.com",
    "ios.recipesage.com",
    "android.recipesage.com",
  ]),
  [FeatureFlagKeys.EnableDiscover]: !IS_SELFHOST,
  [FeatureFlagKeys.EnableServerSettings]: canCustomizeServerUrls,
  [FeatureFlagKeys.EnableBetaServerPreset]:
    !IS_SELFHOST && !isHost("beta.recipesage.com"),
} satisfies Record<FeatureFlagKeys, boolean>;
