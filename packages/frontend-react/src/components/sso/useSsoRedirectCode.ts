import { useEffect, useEffectEvent } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { IS_SELFHOST } from "../../environments/environment";
import { getElectronAPI } from "../../utils/electron";

export const useSsoRedirectCode = (onCode: (code: string) => void) => {
  const handleCode = useEffectEvent((code: string) => onCode(code));

  useEffect(() => {
    if (IS_SELFHOST) return;

    const electronAPI = getElectronAPI();
    if (electronAPI) {
      return electronAPI.onAuthCode((code) => handleCode(code));
    }

    if (!Capacitor.isNativePlatform()) return;

    const listenerP = App.addListener("appUrlOpen", (event) => {
      let url: URL;
      try {
        url = new URL(event.url);
      } catch {
        return;
      }
      if (url.protocol !== "recipesage:") return;

      const code = url.searchParams.get("code");
      void Browser.close();
      if (code) handleCode(code);
    });

    return () => {
      void listenerP.then((listener) => listener.remove());
    };
  }, []);
};
