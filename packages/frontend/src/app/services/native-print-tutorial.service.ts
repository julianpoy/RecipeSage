import { Injectable, inject } from "@angular/core";
import { Router } from "@angular/router";

import {
  QuickTutorialService,
  QuickTutorialOptions,
} from "./quick-tutorial.service";
import { RouteMap } from "./util.service";

@Injectable({
  providedIn: "root",
})
export class NativePrintTutorialService {
  private router = inject(Router);
  private quickTutorialService = inject(QuickTutorialService);

  private printableRouteMatchers = [
    RouteMap.RecipePage.path,
    RouteMap.ShoppingListPage.path,
    RouteMap.MealPlanPage.path,
  ].map(
    (path) => new RegExp(`^/${path.replace(/:[^/]+/g, "[^/]+")}(?:[/?#]|$)`),
  );

  constructor() {
    window.addEventListener("afterprint", () => this.handleAfterPrint());
  }

  private handleAfterPrint() {
    const path = this.router.url.split(/[?#]/)[0];

    const isPrintablePage = this.printableRouteMatchers.some((matcher) =>
      matcher.test(path),
    );
    if (!isPrintablePage) return;

    this.quickTutorialService.triggerQuickTutorial(
      QuickTutorialOptions.NativePrintView,
    );
  }
}
