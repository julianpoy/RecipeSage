export const MATOMO_APP_PLATFORM_DIMENSION_ID = 1;

export const MATOMO_CANONICAL_ORIGIN = "https://recipesage.com";

export const MATOMO_ORIGIN = "https://a.recipesage.com";

export const MATOMO_SITE_ID = "1";

export const APP_PLATFORMS = ["desktop-app", "pwa", "browser"] as const;

export type AppPlatform = (typeof APP_PLATFORMS)[number];

declare global {
  interface Window {
    _paq?: unknown[][];
  }

  interface Navigator {
    standalone?: boolean;
  }
}

export const detectAppPlatform = (isDesktopApp = false): AppPlatform => {
  if (isDesktopApp) return "desktop-app";
  if (typeof window === "undefined") return "browser";

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  return isStandalone ? "pwa" : "browser";
};
