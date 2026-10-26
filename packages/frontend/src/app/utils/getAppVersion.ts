declare global {
  interface Window {
    version?: string;
  }
}

export const getAppVersion = (): string | undefined => {
  if (typeof window === "undefined") return undefined;
  return window.version;
};
