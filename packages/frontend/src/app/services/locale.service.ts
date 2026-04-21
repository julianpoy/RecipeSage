import { Injectable, PLATFORM_ID, REQUEST, inject } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { Router } from "@angular/router";
import {
  GlobalPreferenceKey,
  SupportedLanguages,
} from "@recipesage/util/shared";
import { PreferencesService } from "./preferences.service";
import { UtilService } from "./util.service";

const SUPPORTED_LOCALE_SET: ReadonlySet<string> = new Set(
  Object.values(SupportedLanguages),
);

export const SUPPORTED_LOCALES: SupportedLanguages[] =
  Object.values(SupportedLanguages);

@Injectable({
  providedIn: "root",
})
export class LocaleService {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private request = inject(REQUEST, { optional: true });
  private router = inject(Router);
  private preferencesService = inject(PreferencesService);
  private utilService = inject(UtilService);

  getUrlLocale(path?: string): SupportedLanguages | null {
    const pathname = path ?? this.getCurrentPathname();
    if (!pathname) return null;
    const firstSegment = pathname.split("/").filter(Boolean)[0];
    if (!firstSegment) return null;
    const lower = firstSegment.toLowerCase();
    if (SUPPORTED_LOCALE_SET.has(lower)) {
      return lower as SupportedLanguages;
    }
    return null;
  }

  getActiveLanguage(): string {
    const urlLocale = this.getUrlLocale();
    if (urlLocale) return urlLocale;

    if (!this.isBrowser) return SupportedLanguages.EN_US;

    const prefLang =
      this.preferencesService.preferences[GlobalPreferenceKey.Language];
    if (prefLang) return prefLang;

    return this.utilService.getAppBrowserLang();
  }

  private getCurrentPathname(): string {
    if (this.isBrowser) return window.location.pathname;

    const navigation = this.router.getCurrentNavigation();
    const finalUrl = navigation?.finalUrl ?? navigation?.extractedUrl;
    if (finalUrl)
      return "/" + finalUrl.toString().replace(/^\//, "").split("?")[0];

    const routerUrl = this.router.url;
    if (routerUrl && routerUrl !== "/") return routerUrl.split("?")[0];

    const url = this.request?.url;
    if (!url) return "";
    try {
      return new URL(url).pathname;
    } catch {
      return url.startsWith("/") ? url.split("?")[0] : "";
    }
  }
}
