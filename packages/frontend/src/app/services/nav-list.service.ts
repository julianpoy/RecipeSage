import { Injectable, inject } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";

import { UtilService, RouteMap, AuthType } from "./util.service";
import { FeatureFlagKeys, FeatureFlagService } from "./feature-flag.service";

export interface NavPage {
  id: string;
  title: string;
  icon: string;
  url: string;
}

@Injectable({
  providedIn: "root",
})
export class NavListService {
  private translate = inject(TranslateService);
  private utilService = inject(UtilService);
  private featureFlagService = inject(FeatureFlagService);

  async generateNavList(): Promise<NavPage[]> {
    const login = await this.translate.get("pages.app.nav.login").toPromise();
    const register = await this.translate
      .get("pages.app.nav.register")
      .toPromise();
    const download = await this.translate
      .get("pages.app.nav.download")
      .toPromise();
    const contribute = await this.translate
      .get("pages.app.nav.contribute")
      .toPromise();
    const about = await this.translate.get("pages.app.nav.about").toPromise();

    const home = await this.translate.get("pages.app.nav.home").toPromise();
    const labels = await this.translate.get("pages.app.nav.labels").toPromise();
    const people = await this.translate.get("pages.app.nav.people").toPromise();
    const discover = await this.translate
      .get("pages.app.nav.discover")
      .toPromise();
    const newrecipe = await this.translate
      .get("pages.app.nav.newrecipe")
      .toPromise();
    const shopping = await this.translate
      .get("pages.app.nav.shopping")
      .toPromise();
    const meals = await this.translate.get("pages.app.nav.meals").toPromise();
    const tools = await this.translate.get("pages.app.nav.tools").toPromise();
    const settings = await this.translate
      .get("pages.app.nav.settings")
      .toPromise();

    const enableInstallInstructions =
      this.featureFlagService.flags[FeatureFlagKeys.EnableInstallInstructions];
    const enableContribution =
      this.featureFlagService.flags[FeatureFlagKeys.EnableContribution];
    const enableDiscover =
      this.featureFlagService.flags[FeatureFlagKeys.EnableDiscover];
    const loggedOutPages: [boolean, NavPage][] = [
      [
        true,
        {
          id: "login",
          title: login,
          icon: "log-in-outline",
          url: RouteMap.AuthPage.getPath(AuthType.Login),
        },
      ],
      [
        true,
        {
          id: "register",
          title: register,
          icon: "leaf-outline",
          url: RouteMap.AuthPage.getPath(AuthType.Register),
        },
      ],
      [
        enableDiscover,
        {
          id: "discover",
          title: discover,
          icon: "compass-outline",
          url: RouteMap.DiscoverPage.getPath(),
        },
      ],
      [
        enableInstallInstructions,
        {
          id: "download",
          title: download,
          icon: "cloud-download-outline",
          url: RouteMap.DownloadAndInstallPage.getPath(),
        },
      ],
      [
        enableContribution,
        {
          id: "contribute",
          title: contribute,
          icon: "heart-outline",
          url: RouteMap.ContributePage.getPath(),
        },
      ],
      [
        true,
        {
          id: "settings",
          title: settings,
          icon: "settings-outline",
          url: RouteMap.SettingsPage.getPath(),
        },
      ],
      [
        true,
        {
          id: "about",
          title: about,
          icon: "help-buoy-outline",
          url: RouteMap.AboutPage.getPath(),
        },
      ],
    ];

    const loggedInPages: [boolean, NavPage][] = [
      [
        true,
        {
          id: "home",
          title: home,
          icon: "book-outline",
          url: RouteMap.HomePage.getPath("main"),
        },
      ],
      [
        true,
        {
          id: "newrecipe",
          title: newrecipe,
          icon: "add-outline",
          url: RouteMap.EditRecipePage.getPath("new"),
        },
      ],
      [
        true,
        {
          id: "shopping",
          title: shopping,
          icon: "cart-outline",
          url: RouteMap.ShoppingListsPage.getPath(),
        },
      ],
      [
        true,
        {
          id: "meals",
          title: meals,
          icon: "calendar-outline",
          url: RouteMap.MealPlansPage.getPath(),
        },
      ],
      [
        true,
        {
          id: "people",
          title: people,
          icon: "people-outline",
          url: RouteMap.PeoplePage.getPath(),
        },
      ],
      [
        enableDiscover,
        {
          id: "discover",
          title: discover,
          icon: "compass-outline",
          url: RouteMap.DiscoverPage.getPath(),
        },
      ],
      [
        true,
        {
          id: "tools",
          title: tools,
          icon: "construct-outline",
          url: RouteMap.ToolsPage.getPath(),
        },
      ],
      [
        true,
        {
          id: "labels",
          title: labels,
          icon: "pricetag-outline",
          url: RouteMap.LabelsPage.getPath(),
        },
      ],
      [
        enableInstallInstructions,
        {
          id: "download",
          title: download,
          icon: "cloud-download-outline",
          url: RouteMap.DownloadAndInstallPage.getPath(),
        },
      ],
      [
        enableContribution,
        {
          id: "contribute",
          title: contribute,
          icon: "heart-outline",
          url: RouteMap.ContributePage.getPath(),
        },
      ],
      [
        true,
        {
          id: "settings",
          title: settings,
          icon: "settings-outline",
          url: RouteMap.SettingsPage.getPath(),
        },
      ],
      [
        true,
        {
          id: "about",
          title: about,
          icon: "help-buoy-outline",
          url: RouteMap.AboutPage.getPath(),
        },
      ],
    ];

    const pages = this.utilService.isLoggedIn()
      ? loggedInPages
      : loggedOutPages;

    return pages.filter((page) => page[0]).map((page) => page[1]);
  }
}
