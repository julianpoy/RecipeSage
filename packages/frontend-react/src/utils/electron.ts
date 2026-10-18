export interface DesktopNotification {
  title: string;
  body: string;
  tag: string;
  route?: string;
}

export interface ElectronAPI {
  isDesktop: true;
  onAuthCode: (callback: (code: string) => void) => () => void;
  writeCachedImageFile: (cachePath: string, data: Uint8Array) => Promise<void>;
  deleteCachedImageFile: (cachePath: string) => Promise<void>;
  showNotification: (notification: DesktopNotification) => Promise<void>;
  onNotificationClick: (callback: (route: string) => void) => () => void;
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
