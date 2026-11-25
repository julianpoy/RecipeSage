import { Injectable, inject } from "@angular/core";
import { NavigationEnd, Router } from "@angular/router";
import { RouteMap } from "./util.service";
import { getRoutePattern } from "../utils/getRoutePattern";

const LAST_ROUTE_LOCALSTORAGE_KEY = "lastRoute";

const CATCHALL_ROUTE_PATTERN = "/**";

const EXCLUDED_PATH_PREFIXES = [
  "/auth/",
  RouteMap.GetStartedPage.getPath(),
  RouteMap.WelcomeFlowPage.getPath(),
  RouteMap.ContributeCancelPage.getPath(),
  RouteMap.ContributeThankYouPage.getPath(),
];

const EXCLUDED_QUERY_PARAMS = [
  "token",
  "autofill-url",
  "sharetarget-text",
  "sharetarget-title",
];

@Injectable({
  providedIn: "root",
})
export class LastRouteService {
  private router = inject(Router);

  init() {
    this.router.events.subscribe((event) => {
      if (!(event instanceof NavigationEnd)) return;
      this.save(event.urlAfterRedirects);
    });
  }

  get(): string | null {
    return localStorage.getItem(LAST_ROUTE_LOCALSTORAGE_KEY);
  }

  clear() {
    localStorage.removeItem(LAST_ROUTE_LOCALSTORAGE_KEY);
  }

  private save(url: string) {
    const routePattern = getRoutePattern(this.router.routerState.snapshot.root);
    if (routePattern === CATCHALL_ROUTE_PATTERN) return;

    const path = url.split("?")[0];
    if (EXCLUDED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) {
      return;
    }

    const urlTree = this.router.parseUrl(url);
    for (const queryParam of EXCLUDED_QUERY_PARAMS) {
      delete urlTree.queryParams[queryParam];
    }

    localStorage.setItem(
      LAST_ROUTE_LOCALSTORAGE_KEY,
      this.router.serializeUrl(urlTree),
    );
  }
}
