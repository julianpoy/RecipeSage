import {
  Injectable,
  PLATFORM_ID,
  REQUEST,
  inject,
  DestroyRef,
} from "@angular/core";
import { isPlatformBrowser, DOCUMENT } from "@angular/common";
import { Meta } from "@angular/platform-browser";
import { TranslateService } from "@ngx-translate/core";
import { NavigationEnd, Router } from "@angular/router";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { filter } from "rxjs/operators";
import { SupportedLanguages } from "@recipesage/util/shared";

import { LocaleService, SUPPORTED_LOCALES } from "./locale.service";

const SITE_LOGO_PATH = "/assets/imgs/logo_green.png";

@Injectable({
  providedIn: "root",
})
export class HeadService {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private request = inject(REQUEST, { optional: true });
  private document = inject(DOCUMENT);
  private metaService = inject(Meta);
  private translate = inject(TranslateService);
  private router = inject(Router);
  private localeService = inject(LocaleService);
  private destroyRef = inject(DestroyRef);

  init() {
    this.updateForCurrentUrl();
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.updateForCurrentUrl());
  }

  private updateForCurrentUrl() {
    const origin = this.resolveOrigin();
    if (!origin) return;

    const pathname = this.currentPathname();
    const pathnameWithoutLocale = this.stripLocalePrefix(pathname);
    const bareUrl = origin + (pathnameWithoutLocale || "/");

    const canonicalHref =
      origin +
      this.withLocalePrefix(pathnameWithoutLocale, this.currentLocale());

    this.setCanonical(canonicalHref);
    this.setAlternates(origin, pathnameWithoutLocale, bareUrl);
    this.metaService.updateTag({ property: "og:url", content: canonicalHref });
    this.metaService.updateTag({
      property: "og:logo",
      content: origin + SITE_LOGO_PATH,
    });

    const description = this.translate.instant("seo.siteDescription");
    if (description && description !== "seo.siteDescription") {
      this.metaService.updateTag({ name: "description", content: description });
      this.metaService.updateTag({
        property: "og:description",
        content: description,
      });
    }
  }

  private currentPathname(): string {
    if (this.isBrowser) return window.location.pathname;
    const url = this.request?.url;
    if (url) {
      try {
        return new URL(url).pathname;
      } catch {
        return url.split("?")[0];
      }
    }
    const routerUrl = this.router.url;
    return routerUrl ? routerUrl.split("?")[0] : "/";
  }

  private currentLocale(): SupportedLanguages | null {
    return this.localeService.getUrlLocale(this.currentPathname());
  }

  private stripLocalePrefix(pathname: string): string {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) return "";
    const first = segments[0].toLowerCase();
    if (SUPPORTED_LOCALES.includes(first as SupportedLanguages)) {
      return "/" + segments.slice(1).join("/");
    }
    return pathname.startsWith("/") ? pathname : "/" + pathname;
  }

  private withLocalePrefix(
    pathnameWithoutLocale: string,
    locale: SupportedLanguages | null,
  ): string {
    const path = pathnameWithoutLocale || "/";
    if (!locale) return path;
    if (path === "/") return "/" + locale;
    return "/" + locale + path;
  }

  private resolveOrigin(): string {
    if (this.isBrowser) return window.location.origin;
    const url = this.request?.url;
    if (url) {
      try {
        return new URL(url).origin;
      } catch {
        // fall through to env
      }
    }
    const envOrigin =
      typeof process !== "undefined" ? process.env?.["SITE_ORIGIN"] : undefined;
    return envOrigin ? envOrigin.replace(/\/$/, "") : "";
  }

  private setCanonical(href: string) {
    const head = this.document.head;
    let link = head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement("link");
      link.setAttribute("rel", "canonical");
      head.appendChild(link);
    }
    link.setAttribute("href", href);
  }

  private setAlternates(
    origin: string,
    pathnameWithoutLocale: string,
    bareUrl: string,
  ) {
    const head = this.document.head;
    const existing = head.querySelectorAll('link[rel="alternate"][hreflang]');
    existing.forEach((node) => node.parentNode?.removeChild(node));

    for (const locale of SUPPORTED_LOCALES) {
      const link = this.document.createElement("link");
      link.setAttribute("rel", "alternate");
      link.setAttribute("hreflang", locale);
      link.setAttribute(
        "href",
        origin + this.withLocalePrefix(pathnameWithoutLocale, locale),
      );
      head.appendChild(link);
    }

    const defaultLink = this.document.createElement("link");
    defaultLink.setAttribute("rel", "alternate");
    defaultLink.setAttribute("hreflang", "x-default");
    defaultLink.setAttribute("href", bareUrl);
    head.appendChild(defaultLink);
  }
}
