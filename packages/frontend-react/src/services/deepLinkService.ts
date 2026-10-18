import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { navigation } from "../routes/navigation";

const APP_LINK_HOSTS = [
  "recipesage.com",
  "www.recipesage.com",
  "beta.recipesage.com",
];

const APP_PATH_PREFIX = "/app";

const handleUrl = (rawUrl: string) => {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return;
  }

  if (url.protocol !== "https:") return;
  if (!APP_LINK_HOSTS.includes(url.hostname)) return;
  if (
    url.pathname !== APP_PATH_PREFIX &&
    !url.pathname.startsWith(`${APP_PATH_PREFIX}/`)
  ) {
    return;
  }

  const internalPath = url.pathname.slice(APP_PATH_PREFIX.length) || "/";
  const target = `${internalPath}${url.search}${url.hash}`;
  navigation.navigateToHref(target);
};

export const deepLinkService = {
  init() {
    if (!Capacitor.isNativePlatform()) return;

    void App.getLaunchUrl().then((launch) => {
      if (launch?.url) handleUrl(launch.url);
    });

    void App.addListener("appUrlOpen", (event) => {
      handleUrl(event.url);
    });
  },
};
