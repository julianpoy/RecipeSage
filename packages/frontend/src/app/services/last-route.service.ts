import { Injectable, inject } from "@angular/core";
import { NavigationEnd, Router } from "@angular/router";
import { RouteMap } from "./util.service";

const LAST_ROUTE_LOCALSTORAGE_KEY = "lastRoute";

const EXCLUDED_PATH_PREFIXES = [
  "/auth/",
  RouteMap.GetStartedPage.getPath(),
  RouteMap.WelcomeFlowPage.getPath(),
  RouteMap.ContributeCancelPage.getPath(),
  RouteMap.ContributeThankYouPage.getPath(),
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
    const path = url.split("?")[0];
    if (EXCLUDED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) {
      return;
    }

    localStorage.setItem(LAST_ROUTE_LOCALSTORAGE_KEY, url);
  }
}
