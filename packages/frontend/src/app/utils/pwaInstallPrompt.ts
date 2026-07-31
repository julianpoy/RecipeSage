export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    deferredInstallPrompt?: BeforeInstallPromptEvent;
  }
}

export const getInstallPrompt = (): BeforeInstallPromptEvent | undefined => {
  if (typeof window === "undefined") return undefined;
  return window.deferredInstallPrompt;
};

export const clearInstallPrompt = (): void => {
  window.deferredInstallPrompt = undefined;
};
