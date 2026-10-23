import { Component, inject } from "@angular/core";

import { NavListService, type NavPage } from "../../services/nav-list.service";
import {
  NATIVE_TAB_NAV_IDS,
  NativeTabBarService,
} from "../../services/native-tab-bar.service";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItemGroup,
  IonItem,
  IonLabel,
  IonIcon,
  IonBadge,
} from "@ionic/angular/standalone";

@Component({
  standalone: true,
  selector: "page-more",
  templateUrl: "more.page.html",
  styleUrls: ["more.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItemGroup,
    IonItem,
    IonLabel,
    IonIcon,
    IonBadge,
  ],
})
export class MorePage {
  private navListService = inject(NavListService);
  private nativeTabBarService = inject(NativeTabBarService);

  navList: NavPage[] = [];
  moreTabBadgeCount = this.nativeTabBarService.moreTabBadgeCount;

  ionViewWillEnter() {
    void this.updateNavList();
  }

  async updateNavList() {
    const navList = await this.navListService.generateNavList();
    this.navList = navList.filter(
      (page) => !NATIVE_TAB_NAV_IDS.includes(page.id),
    );
  }
}
