import { Capacitor } from "@capacitor/core";
import {
  DEFAULT_API_BASE_URL,
  DEFAULT_GRIP_WS_URL,
  environment,
  IS_DESKTOP,
  IS_SELFHOST,
} from "../../environments/environment";
import { getIsElectron } from "./electron";

export type ServerPreset = "default" | "production" | "beta" | "custom";

export interface ServerConfig {
  preset: ServerPreset;
  apiBase: string;
  gripWsBase: string;
  webBase: string;
}

export const PUBLIC_WEB_ORIGIN = "https://recipesage.com";

export const PROD_API_BASE_URL = "https://api.recipesage.com/";
export const PROD_GRIP_WS_BASE = "wss://grip.recipesage.com/ws";
export const BETA_API_BASE_URL = "https://api.beta.recipesage.com/";
export const BETA_GRIP_WS_BASE = "wss://grip.recipesage.com/ws";
export const BETA_WEB_ORIGIN = "https://beta.recipesage.com";

export const SERVER_PRESET_STORAGE_KEY = "apiUris.preset";
export const CUSTOM_API_BASE_URL_KEY = "apiUris.apiBase";
export const CUSTOM_GRIP_WS_URL_KEY = "apiUris.gripWs";
export const CUSTOM_WEB_BASE_URL_KEY = "apiUris.webBase";

export const canCustomizeServerUrls =
  !environment.production ||
  IS_DESKTOP ||
  IS_SELFHOST ||
  Capacitor.isNativePlatform() ||
  self.location.hostname === "android.recipesage.com" ||
  self.location.hostname === "ios.recipesage.com" ||
  self.location.hostname === "windows.recipesage.com" ||
  self.location.hostname === "beta.recipesage.com";

export const canCustomizeWebBase =
  IS_DESKTOP || getIsElectron() || Capacitor.isNativePlatform();

function getWebBaseFromApiBase(apiBase: string): string {
  try {
    return new URL(apiBase).origin;
  } catch {
    return PUBLIC_WEB_ORIGIN;
  }
}

function updateApiBase(): ServerConfig {
  let preset = localStorage.getItem(SERVER_PRESET_STORAGE_KEY);
  const customApiBaseUrl = localStorage.getItem(CUSTOM_API_BASE_URL_KEY);
  const customGripWsUrl = localStorage.getItem(CUSTOM_GRIP_WS_URL_KEY);
  const customWebBaseUrl = localStorage.getItem(CUSTOM_WEB_BASE_URL_KEY);

  if (preset === "custom" && (!customApiBaseUrl || !customGripWsUrl)) {
    preset = "default";
  }

  if (
    !canCustomizeServerUrls ||
    !["production", "beta", "custom"].includes(preset || "")
  ) {
    if (window.location.hostname === "beta.recipesage.com") {
      preset = "beta";
    } else {
      preset = "default";
    }
  }

  switch (preset) {
    case "production": {
      return {
        preset: "production",
        apiBase: PROD_API_BASE_URL,
        gripWsBase: PROD_GRIP_WS_BASE,
        webBase: PUBLIC_WEB_ORIGIN,
      };
    }
    case "beta": {
      return {
        preset: "beta",
        apiBase: BETA_API_BASE_URL,
        gripWsBase: BETA_GRIP_WS_BASE,
        webBase: BETA_WEB_ORIGIN,
      };
    }
    case "custom": {
      return {
        preset: "custom",
        apiBase: customApiBaseUrl!,
        gripWsBase: customGripWsUrl!,
        webBase: customWebBaseUrl || getWebBaseFromApiBase(customApiBaseUrl!),
      };
    }
    default: {
      return {
        preset: "default",
        apiBase: DEFAULT_API_BASE_URL,
        gripWsBase: DEFAULT_GRIP_WS_URL,
        webBase: PUBLIC_WEB_ORIGIN,
      };
    }
  }
}

export const serverConfig = updateApiBase();

export const getShareLinkOrigin = (): string => {
  if (!canCustomizeWebBase) return window.location.origin;

  return serverConfig.webBase;
};
