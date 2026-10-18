import { Capacitor } from "@capacitor/core";
import { PUBLIC_WEB_ORIGIN } from "./serverConfig";
import { getIsElectron } from "./electron";

export const buildPublicRoutePath = (routePath: string) => {
  // Only the hosted donation flow reaches this (self-host redirects to
  // recipesage.com to donate), so native always resolves to the hosted origin.
  const origin =
    Capacitor.isNativePlatform() || getIsElectron()
      ? PUBLIC_WEB_ORIGIN
      : window.location.origin;
  return `${origin}/app/${routePath}`;
};
