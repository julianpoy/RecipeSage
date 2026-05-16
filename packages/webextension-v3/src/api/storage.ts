export interface ExtensionPreferences {
  disableAutoSnip?: boolean;
  seenTutorial?: boolean;
  autoClipNutrition?: boolean;
  autoOpenAfterImport?: boolean;
}

export const getToken = async (): Promise<string | undefined> => {
  const result = await chrome.storage.local.get(["token"]);
  return typeof result.token === "string" ? result.token : undefined;
};

export const setToken = (token: string | null): Promise<void> =>
  chrome.storage.local.set({ token });

export const getPreferences = async (): Promise<ExtensionPreferences> => {
  const result = await chrome.storage.local.get([
    "disableAutoSnip",
    "seenTutorial",
    "autoClipNutrition",
    "autoOpenAfterImport",
  ]);
  return {
    disableAutoSnip:
      typeof result.disableAutoSnip === "boolean"
        ? result.disableAutoSnip
        : undefined,
    seenTutorial:
      typeof result.seenTutorial === "boolean"
        ? result.seenTutorial
        : undefined,
    autoClipNutrition:
      typeof result.autoClipNutrition === "boolean"
        ? result.autoClipNutrition
        : undefined,
    autoOpenAfterImport:
      typeof result.autoOpenAfterImport === "boolean"
        ? result.autoOpenAfterImport
        : undefined,
  };
};

export const setPreferences = (prefs: ExtensionPreferences): Promise<void> =>
  chrome.storage.local.set(prefs);
