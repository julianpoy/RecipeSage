import { Injectable, NgZone, inject, signal } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { NavController, isPlatform } from "@ionic/angular";
import {
  NativeNavigation,
  type NativeNavigationTabbarOptions,
} from "@capgo/capacitor-native-navigation";
import {
  Foldable,
  type BarPlacement,
  type FoldState,
} from "@erkamyaman/capacitor-foldable";
import {
  applyFoldStateClasses,
  setVerticalBarsLayout,
  type VerticalBarsLayout,
} from "@rdlabo/ionic-theme-ios27";

import { RouteMap } from "./util.service";
import { EventName, EventService } from "./event.service";
import { IS_NATIVE_IOS } from "../utils/isNativeIOS";

const NATIVE_TABS = [
  {
    id: "home",
    titleKey: "pages.app.tabs.recipes",
    sfSymbol: "book",
    selectedSfSymbol: "book.fill",
    url: RouteMap.HomePage.getPath("main"),
    path: RouteMap.HomePage.path.split("/")[0],
  },
  {
    id: "shopping",
    titleKey: "pages.app.nav.shopping",
    sfSymbol: "cart",
    selectedSfSymbol: "cart.fill",
    url: RouteMap.ShoppingListsPage.getPath(),
    path: RouteMap.ShoppingListsPage.path,
  },
  {
    id: "meals",
    titleKey: "pages.app.nav.meals",
    sfSymbol: "calendar",
    selectedSfSymbol: "calendar",
    url: RouteMap.MealPlansPage.getPath(),
    path: RouteMap.MealPlansPage.path,
  },
  {
    id: "tools",
    titleKey: "pages.app.tabs.tools",
    sfSymbol: "wrench.and.screwdriver",
    selectedSfSymbol: "wrench.and.screwdriver.fill",
    url: RouteMap.ToolsPage.getPath(),
    path: RouteMap.ToolsPage.path,
  },
  {
    id: "more",
    titleKey: "pages.app.tabs.more",
    sfSymbol: "ellipsis",
    selectedSfSymbol: "ellipsis",
    url: RouteMap.MorePage.getPath(),
    path: RouteMap.MorePage.path,
  },
];

export const NATIVE_TAB_NAV_IDS = NATIVE_TABS.map((tab) => tab.id);

const OVERLAY_PRESENT_EVENTS = [
  "ionModalWillPresent",
  "ionActionSheetWillPresent",
  "ionAlertWillPresent",
  "ionPopoverWillPresent",
  "ionLoadingWillPresent",
];
const OVERLAY_DISMISS_EVENTS = [
  "ionModalWillDismiss",
  "ionActionSheetWillDismiss",
  "ionAlertWillDismiss",
  "ionPopoverWillDismiss",
  "ionLoadingWillDismiss",
];

@Injectable({
  providedIn: "root",
})
export class NativeTabBarService {
  private navCtrl = inject(NavController);
  private ngZone = inject(NgZone);
  private translate = inject(TranslateService);
  private events = inject(EventService);

  private visible = false;
  private selectedId = NATIVE_TABS[0].id;
  readonly moreTabBadgeCount = signal<number | undefined>(undefined);
  private openOverlayCount = 0;
  private verticalBarsLayout: VerticalBarsLayout = { edge: null };
  private verticalBarInset = 0;
  private lastTabbarOptions?: string;

  init() {
    if (!IS_NATIVE_IOS) return;

    void NativeNavigation.configure({ contentInsetMode: "css" });
    void NativeNavigation.addListener("tabSelect", ({ id }) => {
      this.ngZone.run(() => this.selectTab(id));
    });

    for (const eventName of OVERLAY_PRESENT_EVENTS) {
      document.addEventListener(eventName, () => {
        this.openOverlayCount++;
        this.render();
      });
    }
    for (const eventName of OVERLAY_DISMISS_EVENTS) {
      document.addEventListener(eventName, () => {
        this.openOverlayCount = Math.max(0, this.openOverlayCount - 1);
        this.render();
      });
    }

    this.translate.onLangChange.subscribe(() => this.render());

    this.initFoldable().catch((e) => {
      console.error("Failed to read foldable state", e);
    });
  }

  setVisible(visible: boolean) {
    if (!IS_NATIVE_IOS) return;

    this.visible = visible;
    this.render();
  }

  setSelectedFromUrl(url: string) {
    if (!IS_NATIVE_IOS) return;

    const path = url.split("?")[0].replace(/^\//, "");
    const tab = NATIVE_TABS.find(
      (tab) => path === tab.path || path.startsWith(`${tab.path}/`),
    );
    if (!tab) return;

    this.selectedId = tab.id;
    this.render();
  }

  setMoreTabBadgeCount(count: number | undefined) {
    if (!IS_NATIVE_IOS) return;

    this.moreTabBadgeCount.set(count || undefined);
    this.render();
  }

  private selectTab(id: string) {
    const tab = NATIVE_TABS.find((tab) => tab.id === id);
    if (!tab) return;

    this.selectedId = tab.id;
    void this.navCtrl.navigateRoot(tab.url);
  }

  private async initFoldable() {
    await Foldable.addListener("barPlacementChange", (placement) =>
      this.ngZone.run(() => this.setBarPlacement(placement)),
    );
    await Foldable.addListener("foldStateChange", (fold) =>
      this.applyFoldState(fold),
    );

    window.addEventListener("resize", this.refreshBarPlacement);

    this.setBarPlacement(await Foldable.getBarPlacement());
    this.applyFoldState(await Foldable.getFoldState());
  }

  private refreshBarPlacement = () => {
    Foldable.getBarPlacement()
      .then((placement) =>
        this.ngZone.run(() => this.setBarPlacement(placement)),
      )
      .catch((e) => {
        console.error("Failed to read bar placement", e);
      });
  };

  private setBarPlacement({ verticalBarEdge, inset }: BarPlacement) {
    if (
      verticalBarEdge === this.verticalBarsLayout.edge &&
      inset === this.verticalBarsLayout.inset
    ) {
      return;
    }

    this.verticalBarsLayout = { edge: verticalBarEdge, inset };
    this.render();
  }

  private applyFoldState(fold: FoldState) {
    const root = document.querySelector("ion-app");
    if (root) applyFoldStateClasses(root, fold);
  }

  getHorizontalContentInset() {
    const rootStyle = getComputedStyle(document.documentElement);
    const safeAreaLeft =
      parseFloat(rootStyle.getPropertyValue("--rs-safe-area-left")) || 0;
    const safeAreaRight =
      parseFloat(rootStyle.getPropertyValue("--rs-safe-area-right")) || 0;

    if (this.verticalBarInset === 0) return safeAreaLeft + safeAreaRight;

    const isRtl = document.documentElement.dir === "rtl";
    const isVerticalBarOnLeft =
      (this.verticalBarsLayout.edge === "leading") !== isRtl;
    return (
      this.verticalBarInset +
      (isVerticalBarOnLeft ? safeAreaRight : safeAreaLeft)
    );
  }

  private render() {
    const verticalBarsLayout: VerticalBarsLayout = this.visible
      ? this.verticalBarsLayout
      : { edge: null };
    setVerticalBarsLayout(verticalBarsLayout);

    const verticalBarInset =
      verticalBarsLayout.edge === null ? 0 : (verticalBarsLayout.inset ?? 0);
    if (verticalBarInset !== this.verticalBarInset) {
      this.verticalBarInset = verticalBarInset;
      this.events.publish(EventName.ApplicationVerticalBarInsetChanged);
    }

    const coversOverlays =
      this.verticalBarsLayout.edge === null && !isPlatform("ipad");
    const options: NativeNavigationTabbarOptions = {
      hidden: !this.visible || (coversOverlays && this.openOverlayCount > 0),
      animated: true,
      selectedId: this.selectedId,
      labelVisibilityMode: "labeled",
      tabs: NATIVE_TABS.map((tab) => ({
        id: tab.id,
        title: this.translate.instant(tab.titleKey),
        icon: { ios: { sfSymbol: tab.sfSymbol } },
        selectedIcon: { ios: { sfSymbol: tab.selectedSfSymbol } },
        badge: tab.id === "more" ? this.moreTabBadgeCount() : undefined,
      })),
    };

    const serializedOptions = JSON.stringify(options);
    if (serializedOptions === this.lastTabbarOptions) return;
    this.lastTabbarOptions = serializedOptions;

    void NativeNavigation.setTabbar(options);
  }
}
