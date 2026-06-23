export interface ElectronAPI {
  isDesktop: true;
  onAuthCode: (callback: (code: string) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export const getElectronAPI = (): ElectronAPI | undefined => {
  if (typeof window !== "undefined" && window.electronAPI?.isDesktop) {
    return window.electronAPI;
  }
  return undefined;
};

export const getIsElectron = (): boolean => !!getElectronAPI();
