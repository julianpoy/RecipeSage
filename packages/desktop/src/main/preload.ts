import { contextBridge, ipcRenderer } from "electron";
import type { DesktopNotification } from "./DesktopNotification";

contextBridge.exposeInMainWorld("electronAPI", {
  isDesktop: true,
  onAuthCode: (callback: (code: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, code: string) =>
      callback(code);
    ipcRenderer.on("auth-code", listener);
    return () => {
      ipcRenderer.removeListener("auth-code", listener);
    };
  },
  writeCachedImageFile: (cachePath: string, data: Uint8Array) =>
    ipcRenderer.invoke("image-cache-write", cachePath, data),
  deleteCachedImageFile: (cachePath: string) =>
    ipcRenderer.invoke("image-cache-delete", cachePath),
  showNotification: (notification: DesktopNotification) =>
    ipcRenderer.invoke("show-notification", notification),
  onNotificationClick: (callback: (route: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, route: string) =>
      callback(route);
    ipcRenderer.on("notification-click", listener);
    return () => {
      ipcRenderer.removeListener("notification-click", listener);
    };
  },
});
