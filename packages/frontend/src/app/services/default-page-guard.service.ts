import { Injectable, inject } from "@angular/core";
import { ActivatedRouteSnapshot } from "@angular/router";
import { NavController } from "@ionic/angular/standalone";
import { UtilService, RouteMap } from "./util.service";
import { PreferencesService } from "./preferences.service";
import { SUPPORTED_LOCALES } from "./locale.service";
import {
  GlobalPreferenceKey,
  StartPageOptions,
  SupportedLanguages,
} from "@recipesage/util/shared";

@Injectable()
export class DefaultPageGuardService {
  private navCtrl = inject(NavController);
  private utilService = inject(UtilService);
  private preferencesService = inject(PreferencesService);

  canActivate(route: ActivatedRouteSnapshot) {
    const isLoggedIn = this.utilService.isLoggedIn();

    if (isLoggedIn) {
      const startPage =
        this.preferencesService.preferences[GlobalPreferenceKey.StartPage];

      let targetPath: string;
      switch (startPage) {
        case StartPageOptions.ManageLabels:
          targetPath = RouteMap.LabelsPage.getPath();
          break;
        case StartPageOptions.MealPlans:
          targetPath = RouteMap.MealPlansPage.getPath();
          break;
        case StartPageOptions.ShoppingLists:
          targetPath = RouteMap.ShoppingListsPage.getPath();
          break;
        case StartPageOptions.MyRecipes:
        default:
          targetPath = RouteMap.HomePage.getPath("main");
          break;
      }

      this.navCtrl.navigateRoot(targetPath);
    } else {
      const localeParam = this.findLocaleParam(route);
      const welcomePath = RouteMap.WelcomePage.getPath();
      const target = localeParam
        ? `/${localeParam}${welcomePath}`
        : welcomePath;
      this.navCtrl.navigateRoot(target);
    }

    return false;
  }

  private findLocaleParam(route: ActivatedRouteSnapshot): string | null {
    let current: ActivatedRouteSnapshot | null = route;
    while (current) {
      const candidate = current.params["locale"];
      if (
        typeof candidate === "string" &&
        SUPPORTED_LOCALES.includes(
          candidate.toLowerCase() as SupportedLanguages,
        )
      ) {
        return candidate.toLowerCase();
      }
      current = current.parent;
    }
    return null;
  }
}
