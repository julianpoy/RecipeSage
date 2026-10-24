import {
  Component,
  inject,
  NgZone,
  ViewChild,
  ChangeDetectionStrategy,
} from "@angular/core";
import { Router, NavigationEnd } from "@angular/router";
import { TranslateService } from "@ngx-translate/core";
import * as Sentry from "@sentry/browser";
import { NgxLoadingBar } from "@ngx-loading-bar/core";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";

import {
  Platform,
  MenuController,
  ToastController,
  AlertController,
  NavController,
} from "@ionic/angular";

import {
  ENABLE_ANALYTICS,
  IS_DESKTOP,
  IS_SELFHOST,
} from "../environments/environment";

import { UtilService, RouteMap } from "./services/util.service";
import { NavListService, type NavPage } from "./services/nav-list.service";
import { NativeTabBarService } from "./services/native-tab-bar.service";
import { IS_NATIVE_IOS } from "./utils/isNativeIOS";
import { MessagingService } from "./services/messaging.service";
import { WebsocketService } from "./services/websocket.service";
import { PreferencesService } from "./services/preferences.service";
import { OfflineModeService } from "./services/offline-mode.service";
import {
  detectAppPlatform,
  GlobalPreferenceKey,
  MATOMO_APP_PLATFORM_DIMENSION_ID,
  MATOMO_CANONICAL_ORIGIN,
  MATOMO_ORIGIN,
  MATOMO_SITE_ID,
  SupportedLanguages,
} from "@recipesage/util/shared";
import { CookingToolbarService } from "./services/cooking-toolbar.service";
import { EventName, EventService } from "./services/event.service";
import { Title } from "@angular/platform-browser";
import { TRPCService } from "./services/trpc.service";
import { ServerActionsService } from "./services/server-actions.service";
import { SyncService } from "./services/sync.service";
import { appIdbStorageManager } from "./utils/appIdbStorageManager";
import { getRoutePattern } from "./utils/getRoutePattern";
import { getElectronAPI } from "./utils/electron";
import { showLocalNotification } from "./utils/showLocalNotification";
import { SHARED_UI_IMPORTS } from "./providers/shared-ui.provider";
import { CookingToolbarComponent } from "./components/cooking-toolbar/cooking-toolbar.component";
import { VersionCheckService } from "./services/versioncheck.service";
import { NativePrintTutorialService } from "./services/native-print-tutorial.service";
import { DeepLinkService } from "./services/deep-link.service";
import { ShareReceiverService } from "./services/share-receiver.service";
import { DebugStoreService } from "./services/debugStore.service";
import { setLocalDbUpgradeMessages } from "./utils/localDb/localDbUpgradeMessages";
import {
  IonApp,
  IonSplitPane,
  IonMenu,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonMenuToggle,
  IonItem,
  IonIcon,
  IonLabel,
  IonBadge,
  IonFooter,
  IonRouterOutlet,
} from "@ionic/angular";
import {
  addOutline,
  bookOutline,
  calendarOutline,
  cartOutline,
  cloudDownloadOutline,
  compassOutline,
  constructOutline,
  heartOutline,
  helpBuoyOutline,
  leafOutline,
  logInOutline,
  peopleOutline,
  pricetagOutline,
  settingsOutline,
} from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "app-root",
  templateUrl: "app.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    ...SHARED_UI_IMPORTS,
    CookingToolbarComponent,
    NgxLoadingBar,
    IonApp,
    IonSplitPane,
    IonMenu,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonMenuToggle,
    IonItem,
    IonIcon,
    IonLabel,
    IonBadge,
    IonFooter,
    IonRouterOutlet,
  ],
})
export class AppComponent {
  private translate = inject(TranslateService);
  private navCtrl = inject(NavController);
  private trpcService = inject(TRPCService);
  private serverActionsService = inject(ServerActionsService);
  private syncService = inject(SyncService);
  private router = inject(Router);
  private platform = inject(Platform);
  private ngZone = inject(NgZone);
  private menuCtrl = inject(MenuController);
  private events = inject(EventService);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);
  private utilService = inject(UtilService);
  private messagingService = inject(MessagingService);
  private websocketService = inject(WebsocketService);
  private preferencesService = inject(PreferencesService);
  private offlineModeService = inject(OfflineModeService);
  private navListService = inject(NavListService);
  private nativeTabBarService = inject(NativeTabBarService);
  private titleService = inject(Title);
  cookingToolbarService = inject(CookingToolbarService);
  private versionCheckService = inject(VersionCheckService);
  private nativePrintTutorialService = inject(NativePrintTutorialService);
  private deepLinkService = inject(DeepLinkService);
  private shareReceiverService = inject(ShareReceiverService);
  debugStoreService = inject(DebugStoreService);

  @ViewChild(IonRouterOutlet) private routerOutlet?: IonRouterOutlet;

  isSelfHost = IS_SELFHOST;
  isLoggedIn?: boolean;
  inCookMode = false;
  menuSwipeEnabled = true;

  // See https://bugzilla.mozilla.org/show_bug.cgi?id=1811099
  enableAnimations = !navigator.userAgent.toLowerCase().includes("firefox");

  navList?: NavPage[];

  inboxCount?: number;
  friendRequestCount?: number;

  get peopleBadgeCount(): number {
    return (this.inboxCount || 0) + (this.friendRequestCount || 0);
  }

  get useNativeTabBar(): boolean {
    return IS_NATIVE_IOS && !!this.isLoggedIn;
  }

  version: number = (window as any).version;

  unsupportedBrowser: boolean =
    !!window.navigator.userAgent.match(/(MSIE|Trident)/);
  seenOldBrowserWarning: boolean = !!localStorage.getItem(
    "seenOldBrowserWarning",
  );

  aboutDetailsHref: string = RouteMap.AboutDetailsPage.getPath();

  preferences = this.preferencesService.preferences;
  preferenceKeys = GlobalPreferenceKey;

  constructor() {
    addIcons({
      addOutline,
      bookOutline,
      calendarOutline,
      cartOutline,
      cloudDownloadOutline,
      compassOutline,
      constructOutline,
      heartOutline,
      helpBuoyOutline,
      leafOutline,
      logInOutline,
      peopleOutline,
      pricetagOutline,
      settingsOutline,
    });

    this.translate.onLangChange.subscribe((params) => {
      (window as any).currentRSLanguage = params.lang;
      this.updateLocalDbUpgradeMessages();
    });
    const languagePref =
      this.preferencesService.preferences[GlobalPreferenceKey.Language];
    const language = languagePref || this.utilService.getAppBrowserLang();
    this.translate.setFallbackLang(SupportedLanguages.EN_US);
    this.translate.use(language);
    this.utilService.setHtmlBrowserLang(language);

    const fontSize =
      this.preferencesService.preferences[GlobalPreferenceKey.FontSize];
    this.utilService.setFontSize(fontSize);

    this.utilService.setAppTheme(
      this.preferencesService.preferences[GlobalPreferenceKey.Theme],
    );

    if (ENABLE_ANALYTICS) {
      this.initAnalytics();
    }

    this.initializeApp();

    this.loadInboxCount();
    this.loadFriendRequestCount();
    this.initUpdateListeners();
    this.initEventListeners();

    if (
      "Notification" in window &&
      (Notification as any).permission === "granted" &&
      this.utilService.isLoggedIn()
    ) {
      this.messagingService.requestNotifications();
    }

    this.initDesktopNotifications();

    this.updateNavList();
    this.updateIsLoggedIn();
    this.migrateSession();

    this.versionCheckService.checkVersion();
  }

  // Attached to pagechange so keep this light
  async checkBrowserCompatibility() {
    if (
      this.unsupportedBrowser &&
      !this.seenOldBrowserWarning &&
      this.utilService.isLoggedIn()
    ) {
      const header = await this.translate
        .get("pages.app.oldBrowserAlert.header")
        .toPromise();
      const message = await this.translate
        .get("pages.app.oldBrowserAlert.message")
        .toPromise();
      const okay = await this.translate.get("generic.okay").toPromise();

      const oldBrowserAlert = await this.alertCtrl.create({
        header,
        message,
        buttons: [
          {
            text: okay,
            handler: () => {
              this.seenOldBrowserWarning = true;
              localStorage.setItem("seenOldBrowserWarning", "true");
            },
          },
        ],
      });

      oldBrowserAlert.present();
    }
  }

  initAnalytics() {
    const _paq = window._paq || [];

    /* tracker methods like "setCustomDimension" should be called before "trackPageView" */
    // _paq.push(['trackPageView']);
    _paq.push(["disableCookies"]);
    _paq.push([
      "setCustomDimension",
      MATOMO_APP_PLATFORM_DIMENSION_ID,
      detectAppPlatform(IS_DESKTOP),
    ]);
    _paq.push(["enableLinkTracking"]);

    const u = `${MATOMO_ORIGIN}/`;
    _paq.push(["setTrackerUrl", u + "matomo.php"]);
    _paq.push(["setSiteId", MATOMO_SITE_ID]);
    const g = document.createElement("script");
    const s = document.getElementsByTagName("script")[0];
    g.type = "text/javascript";
    g.async = true;
    g.defer = true;
    g.src = u + "matomo.js";
    s.parentNode?.insertBefore(g, s);

    window._paq = _paq;
  }

  initUpdateListeners() {
    (window as any).appLoaded = true;

    (window as any).swRegistration?.update()?.catch((e: unknown) => {
      console.error("Failed to check for service worker update", e);
    });
  }

  private initDesktopNotifications() {
    const electronAPI = getElectronAPI();
    if (!electronAPI) return;

    electronAPI.onNotificationClick((route) => {
      this.ngZone.run(() => {
        void this.router.navigateByUrl(route);
      });
    });
  }

  initEventListeners() {
    this.events.subscribe(
      [
        EventName.RecipeCreated,
        EventName.RecipeUpdated,
        EventName.RecipeDeleted,
      ],
      () => {
        this.loadInboxCount();
      },
    );

    this.events.subscribe(EventName.ApplicationLanguageChanged, () => {
      this.updateNavList();
    });

    this.events.subscribe(EventName.CapabilitiesUpdated, () => {
      this.updateNavList();
    });

    this.events.subscribe(EventName.Auth, () => {
      this.updateIsLoggedIn();
      this.updateNavList();
      this.updateNativeTabBar();
      this.loadInboxCount();
      this.loadFriendRequestCount();
    });

    this.websocketService.on("messages:new", async (payload) => {
      const currentPath = this.router.url.split("?")[0];
      if (currentPath === RouteMap.MessagesPage.getPath()) return;
      if (
        currentPath === RouteMap.MessageThreadPage.getPath(payload.otherUser.id)
      ) {
        return;
      }
      const notification = this.translate.instant(
        "pages.app.newMessageToast.message",
        { name: payload.otherUser.name },
      );

      const myMessage = payload;

      const toast = await this.toastCtrl.create({
        message: notification,
        duration: 7000,
        buttons: [
          {
            text: this.translate.instant("pages.app.newMessageToast.view"),
            role: "cancel",
            handler: () => {
              this.navCtrl.navigateForward(
                RouteMap.MessageThreadPage.getPath(myMessage.otherUser.id),
              );
            },
          },
        ],
      });
      toast.present();

      if (!document.hasFocus()) {
        showLocalNotification({
          title: payload.otherUser.name,
          body: payload.recipe ? payload.recipe.title : payload.body,
          route: RouteMap.MessageThreadPage.getPath(payload.otherUser.id),
          tag: `messages:new-${payload.otherUser.id}`,
          skipWhenHidden: true,
        });
      }
    });
  }

  updateIsLoggedIn() {
    this.isLoggedIn = this.utilService.isLoggedIn();
  }

  private async updateLocalDbUpgradeMessages() {
    const [confirm, notRefreshed] = await Promise.all([
      this.translate.get("pages.app.localDbUpgrade.confirm").toPromise(),
      this.translate.get("pages.app.localDbUpgrade.notRefreshed").toPromise(),
    ]);

    setLocalDbUpgradeMessages({ confirm, notRefreshed });
  }

  async updateNavList() {
    this.navList = await this.navListService.generateNavList();
  }

  updateNativeTabBar() {
    this.nativeTabBarService.setVisible(
      this.useNativeTabBar && !this.inCookMode,
    );
    this.nativeTabBarService.setMoreTabBadgeCount(this.peopleBadgeCount);
  }

  async loadInboxCount() {
    if (!localStorage.getItem("token")) return;

    const response = await this.serverActionsService.recipes.getRecipeCount({
      folder: "inbox",
    });
    if (!response) return;

    this.inboxCount = response.count;
    this.updateNativeTabBar();
  }

  async loadFriendRequestCount() {
    if (!localStorage.getItem("token")) return;

    const response = await this.serverActionsService.users.getMyFriends({
      401: () => {},
    });
    if (!response) return;

    this.friendRequestCount = response.incomingRequests?.length || undefined;
    this.updateNativeTabBar();
  }

  updateMenuSwipe() {
    this.menuSwipeEnabled = !this.routerOutlet?.canGoBack();
  }

  private lastBackPressAt = 0;

  initNativeShell() {
    if (!Capacitor.isNativePlatform()) return;

    void SplashScreen.hide();

    this.platform.backButton.subscribeWithPriority(-1, () => {
      if (this.routerOutlet?.canGoBack()) return;

      const now = Date.now();
      if (now - this.lastBackPressAt < 2000) {
        void App.exitApp();
        return;
      }

      this.lastBackPressAt = now;
      void this.presentExitToast();
    });
  }

  private async presentExitToast() {
    const toast = await this.toastCtrl.create({
      message: this.translate.instant("pages.app.pressBackToExit"),
      duration: 2000,
    });
    toast.present();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.menuCtrl.close();
      this.initNativeShell();
    });

    this.deepLinkService.init();
    this.shareReceiverService.init();
    this.nativeTabBarService.init();

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;
      this.ngZone.run(() => {
        this.events.publish(EventName.ApplicationMultitaskingResumed);
      });
    });

    let previousUrl: string | undefined;
    let previousPath: string | undefined;
    this.router.events.subscribe((event) => {
      if (!(event instanceof NavigationEnd)) return;

      this.updateIsLoggedIn();
      this.updateNavList();

      this.inCookMode = event.url.split("?")[0].endsWith("/cook");

      this.updateNativeTabBar();
      this.nativeTabBarService.setSelectedFromUrl(event.urlAfterRedirects);

      this.checkBrowserCompatibility();

      try {
        const _paq = window._paq;

        if (!_paq) return;

        const path = event.urlAfterRedirects.split("?")[0];
        if (path === previousPath) return;
        previousPath = path;

        const routePattern = getRoutePattern(
          this.router.routerState.snapshot.root,
        );
        const url = `${MATOMO_CANONICAL_ORIGIN}/app${routePattern}`;

        if (previousUrl) _paq.push(["setReferrerUrl", previousUrl]);
        previousUrl = url;
        _paq.push(["setCustomUrl", url]);
        _paq.push(["setDocumentTitle", routePattern]);

        _paq.push(["trackPageView"]);

        // make Matomo aware of newly added content
        _paq.push(["MediaAnalytics::scanForMedia"]);
        _paq.push(["FormAnalytics::scanForForms"]);
        _paq.push(["trackContentImpressionsWithinNode"]);
        _paq.push(["enableLinkTracking"]);
      } catch (e) {
        console.warn(e);
      }
    });
  }

  async migrateSession() {
    try {
      await appIdbStorageManager.restoreSessionFromToken();
    } catch (e) {
      Sentry.captureException(e);
    }
  }
}
