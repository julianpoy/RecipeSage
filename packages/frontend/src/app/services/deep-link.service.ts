import { Injectable, NgZone, inject } from "@angular/core";
import { Router } from "@angular/router";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

const APP_LINK_HOSTS = [
  "recipesage.com",
  "www.recipesage.com",
  "beta.recipesage.com",
];
const APP_PATH_PREFIX = "/app";

@Injectable({
  providedIn: "root",
})
export class DeepLinkService {
  private router = inject(Router);
  private ngZone = inject(NgZone);

  init() {
    if (!Capacitor.isNativePlatform()) return;

    void App.addListener("appUrlOpen", (event) => {
      this.handleUrl(event.url);
    });
  }

  private handleUrl(rawUrl: string) {
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

    this.ngZone.run(() => {
      void this.router.navigateByUrl(target);
    });
  }
}
