import { Component, inject, NgZone } from "@angular/core";
import { Router, NavigationEnd } from "@angular/router";
import { TranslateService } from "@ngx-translate/core";
import * as Sentry from "@sentry/browser";
import { NgxLoadingBar } from "@ngx-loading-bar/core";

import {
  Platform,
  MenuController,
  ToastController,
  AlertController,
  NavController,
} from "@ionic/angular/standalone";

import {
  ENABLE_ANALYTICS,
  IS_DESKTOP,
  IS_SELFHOST,
} from "../environments/environment";

import { UtilService, RouteMap, AuthType } from "./services/util.service";
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
import {
  FeatureFlagKeys,
  FeatureFlagService,
} from "./services/feature-flag.service";
import { Title } from "@angular/platform-browser";
import { TRPCService } from "./services/trpc.service";
import { ServerActionsService } from "./services/server-actions.service";
import { SyncService } from "./services/sync.service";
import { appIdbStorageManager } from "./utils/appIdbStorageManager";
import { getRoutePattern } from "./utils/getRoutePattern";
import { SHARED_UI_IMPORTS } from "./providers/shared-ui.provider";
import { CookingToolbarComponent } from "./components/cooking-toolbar/cooking-toolbar.component";
import { VersionCheckService } from "./services/versioncheck.service";
import { NativePrintTutorialService } from "./services/native-print-tutorial.service";
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
} from "@ionic/angular/standalone";
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

interface NavPage {
  id: string;
  title: string;
  icon: string;
  url: string;
}

@Component({
  standalone: true,
  selector: "app-root",
  templateUrl: "app.component.html",
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
  private featureFlagService = inject(FeatureFlagService);
  private titleService = inject(Title);
  cookingToolbarService = inject(CookingToolbarService);
  private versionCheckService = inject(VersionCheckService);
  private nativePrintTutorialService = inject(NativePrintTutorialService);
  debugStoreService = inject(DebugStoreService);

  isSelfHost = IS_SELFHOST;
  isLoggedIn?: boolean;
  inCookMode = false;

  // See https://bugzilla.mozilla.org/show_bug.cgi?id=1811099
  enableAnimations = !navigator.userAgent.toLowerCase().includes("firefox");

  navList?: { id: string; title: string; icon: string; url: string }[];

  inboxCount?: number;
  friendRequestCount?: number;

  get peopleBadgeCount(): number {
    return (this.inboxCount || 0) + (this.friendRequestCount || 0);
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
    this.translate.setDefaultLang(SupportedLanguages.EN_US);
    this.translate.use(language);
    this.utilService.setHtmlBrowserLang(language);

    const fontSize =
      this.preferencesService.preferences[GlobalPreferenceKey.FontSize];
    this.utilService.setFontSize(fontSize);

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

    (window as any).swRegistration?.update();
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

    this.events.subscribe(EventName.Auth, () => {
      this.updateIsLoggedIn();
      this.updateNavList();
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
    this.navList = await this.generateNavList();
  }

  async generateNavList() {
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
    const loggedOutPages = [
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
    ] as [boolean, NavPage][];

    const loggedInPages = [
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
    ] as [boolean, NavPage][];

    const pages = this.utilService.isLoggedIn()
      ? loggedInPages
      : loggedOutPages;

    return pages.filter((page) => page[0]).map((page) => page[1]);
  }

  async loadInboxCount() {
    if (!localStorage.getItem("token")) return;

    const response = await this.serverActionsService.recipes.getRecipeCount({
      folder: "inbox",
    });
    if (!response) return;

    this.inboxCount = response.count;
  }

  async loadFriendRequestCount() {
    if (!localStorage.getItem("token")) return;

    const response = await this.serverActionsService.users.getMyFriends({
      401: () => {},
    });
    if (!response) return;

    this.friendRequestCount = response.incomingRequests?.length || undefined;
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.menuCtrl.close();
    });

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
      const token = localStorage.getItem("token");
      if (!token) return;

      const currentIdbSession = await appIdbStorageManager.getSession();
      if (currentIdbSession) return;

      const me = await this.trpcService.trpc.users.getMe
        .query()
        .catch(() => undefined);

      if (!me) return;

      await appIdbStorageManager.setSession({
        userId: me.id,
        email: me.email,
        token,
      });
    } catch (e) {
      Sentry.captureException(e);
    }
  }
}
