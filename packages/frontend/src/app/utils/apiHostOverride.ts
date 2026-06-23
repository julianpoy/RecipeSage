import { environment } from "../../environments/environment";

const OVERRIDE_LOCALSTORAGE_KEY = "apiHostOverride";

const NATIVE_SHELL_HOSTS = [
  "desktop-vhost.recipesage.com",
  "android.recipesage.com",
  "ios.recipesage.com",
  "windows.recipesage.com",
];

const isNativeShellHost = (): boolean => {
  if (typeof window === "undefined") return false;
  return NATIVE_SHELL_HOSTS.includes(window.location.hostname);
};

export const isServerOverrideAvailable = (): boolean => {
  return isNativeShellHost() || !environment.production;
};

export const isValidServerBaseUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

export const getApiHostOverride = (): string | null => {
  if (!isServerOverrideAvailable()) return null;
  try {
    const stored = localStorage.getItem(OVERRIDE_LOCALSTORAGE_KEY);
    if (!stored || !isValidServerBaseUrl(stored)) return null;
    return stored;
  } catch {
    return null;
  }
};

export const setApiHostOverride = (baseUrl: string | null): void => {
  try {
    if (baseUrl) {
      localStorage.setItem(OVERRIDE_LOCALSTORAGE_KEY, baseUrl);
    } else {
      localStorage.removeItem(OVERRIDE_LOCALSTORAGE_KEY);
    }
  } catch (e) {
    console.error(e);
  }
};
