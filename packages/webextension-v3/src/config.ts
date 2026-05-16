export const DEFAULT_API_BASE = "https://api.recipesage.com";
export const DEFAULT_WEB_BASE = "https://recipesage.com";

const stripTrailingSlash = (url: string) => url.replace(/\/+$/, "");

const STORAGE_KEYS = ["apiBaseOverride", "webBaseOverride"] as const;

const readOverrides = async (): Promise<{
  apiBaseOverride?: string;
  webBaseOverride?: string;
}> => {
  const result = await chrome.storage.local.get([...STORAGE_KEYS]);
  return {
    apiBaseOverride:
      typeof result.apiBaseOverride === "string"
        ? result.apiBaseOverride
        : undefined,
    webBaseOverride:
      typeof result.webBaseOverride === "string"
        ? result.webBaseOverride
        : undefined,
  };
};

export const getApiBase = async (): Promise<string> => {
  const { apiBaseOverride } = await readOverrides();
  return stripTrailingSlash(apiBaseOverride || DEFAULT_API_BASE);
};

export const getWebBase = async (): Promise<string> => {
  const { webBaseOverride } = await readOverrides();
  return stripTrailingSlash(webBaseOverride || DEFAULT_WEB_BASE);
};

export const getEffectiveBases = async (): Promise<{
  apiBase: string;
  webBase: string;
  apiBaseOverride?: string;
  webBaseOverride?: string;
}> => {
  const overrides = await readOverrides();
  return {
    apiBase: stripTrailingSlash(overrides.apiBaseOverride || DEFAULT_API_BASE),
    webBase: stripTrailingSlash(overrides.webBaseOverride || DEFAULT_WEB_BASE),
    apiBaseOverride: overrides.apiBaseOverride,
    webBaseOverride: overrides.webBaseOverride,
  };
};

export const setBaseOverrides = (overrides: {
  apiBaseOverride: string | null;
  webBaseOverride: string | null;
}): Promise<void> =>
  chrome.storage.local.set({
    apiBaseOverride: overrides.apiBaseOverride,
    webBaseOverride: overrides.webBaseOverride,
  });

export const isValidBaseUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};
