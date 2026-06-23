import { contextBridge, ipcRenderer } from "electron";

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
});
