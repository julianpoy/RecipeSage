import { Component } from "@angular/core";
import { ActivatedRoute, Router, NavigationEnd } from "@angular/router";
import { TranslateService } from "@ngx-translate/core";

import {
  Platform,
  MenuController,
  ToastController,
  AlertController,
  NavController,
} from "@ionic/angular";

import { register } from "swiper/element/bundle";
register();

import { ENABLE_ANALYTICS, IS_SELFHOST } from "../environments/environment";

import { UtilService, RouteMap, AuthType } from "~/services/util.service";
import { RecipeService } from "~/services/recipe.service";
import { MessagingService } from "~/services/messaging.service";
import { WebsocketService } from "~/services/websocket.service";
import { UserService } from "~/services/user.service";
import { PreferencesService } from "~/services/preferences.service";
import { GlobalPreferenceKey, SupportedLanguages } from "@recipesage/util";
import { CookingToolbarService } from "~/services/cooking-toolbar.service";
import { EventName, EventService } from "~/services/event.service";
import {
  FeatureFlagKeys,
  FeatureFlagService,
} from "./services/feature-flag.service";

interface NavPage {
  id: string;
  title: string;
  icon: string;
  url: string;
}

@Component({
  selector: "app-root",
  templateUrl: "app.component.html",
})
export class AppComponent {
  isSelfHost = IS_SELFHOST;
  isLoggedIn?: boolean;

  // See https://bugzilla.mozilla.org/show_bug.cgi?id=1811099
  enableAnimations = !navigator.userAgent.toLowerCase().includes("firefox");

  navList?: { id: string; title: string; icon: string; url: string }[];

  inboxCount?: number;
  friendRequestCount?: number;

  version: number = (window as any).version;

  unsupportedBrowser: boolean =
    !!window.navigator.userAgent.match(/(MSIE|Trident)/);
  seenOldBrowserWarning: boolean = !!localStorage.getItem(
    "seenOldBrowserWarning",
  );

  aboutDetailsHref: string = RouteMap.AboutDetailsPage.getPath();

  preferences = this.preferencesService.preferences;
  preferenceKeys = GlobalPreferenceKey;

  constructor(
    private translate: TranslateService,
    private navCtrl: NavController,
    private route: ActivatedRoute,
    private router: Router,
    private platform: Platform,
    private menuCtrl: MenuController,
    private events: EventService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private utilService: UtilService,
    private recipeService: RecipeService,
    private messagingService: MessagingService,
    private websocketService: WebsocketService,
    private userService: UserService,
    private preferencesService: PreferencesService,
    private featureFlagService: FeatureFlagService,
    public cookingToolbarService: CookingToolbarService, // Required by template
  ) {
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
    const _paq = (window as any)._paq || [];

    /* tracker methods like "setCustomDimension" should be called before "trackPageView" */
    // _paq.push(['trackPageView']);
    _paq.push(["enableLinkTracking"]);

    const u = "//a.recipesage.com/";
    _paq.push(["setTrackerUrl", u + "piwik.php"]);
    _paq.push(["setSiteId", "1"]);
    const g = document.createElement("script");
    const s = document.getElementsByTagName("script")[0];
    g.type = "text/javascript";
    g.async = true;
    g.defer = true;
    g.src = u + "piwik.js";
    s.parentNode?.insertBefore(g, s);

    (window as any)._paq = _paq;
  }

  initUpdateListeners() {
    (window as any).appLoaded = true;
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

    this.events.subscribe(EventName.Auth, () => {
      this.updateIsLoggedIn();
      this.updateNavList();
      this.loadInboxCount();
      this.loadFriendRequestCount();
    });

    this.websocketService.register(
      "messages:new",
      async (payload) => {
        if (
          this.route.snapshot.url
            .toString()
            .indexOf(RouteMap.MessagesPage.getPath())
        )
          return;
        const notification =
          "New message from " +
          (payload.otherUser.name || payload.otherUser.email);

        const myMessage = payload;

        const toast = await this.toastCtrl.create({
          message: notification,
          duration: 7000,
          buttons: [
            {
              text: "View",
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
      },
      this,
    );
  }

  updateIsLoggedIn() {
    this.isLoggedIn = this.utilService.isLoggedIn();
  }

  async updateNavList() {
    this.navList = await this.generateNavList();
  }

  async generateNavList() {
    const welcome = await this.translate
      .get("pages.app.nav.welcome")
      .toPromise();
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
    const assistant = await this.translate
      .get("pages.app.nav.assistant")
      .toPromise();
    const messages = await this.translate
      .get("pages.app.nav.messages")
      .toPromise();
    const inbox = await this.translate.get("pages.app.nav.inbox").toPromise();
    const newrecipe = await this.translate
      .get("pages.app.nav.newrecipe")
      .toPromise();
    const shopping = await this.translate
      .get("pages.app.nav.shopping")
      .toPromise();
    const meals = await this.translate.get("pages.app.nav.meals").toPromise();
    const settings = await this.translate
      .get("pages.app.nav.settings")
      .toPromise();

    const enableInstallInstructions =
      this.featureFlagService.flags[FeatureFlagKeys.EnableInstallInstructions];
    const enableAssistant =
      this.featureFlagService.flags[FeatureFlagKeys.EnableAssistant];
    const enableContribution =
      this.featureFlagService.flags[FeatureFlagKeys.EnableContribution];
    const loggedOutPages = [
      [
        true,
        {
          id: "welcome",
          title: welcome,
          icon: "sunny",
          url: RouteMap.WelcomePage.getPath(),
        },
      ],
      [
        true,
        {
          id: "login",
          title: login,
          icon: "log-in",
          url: RouteMap.AuthPage.getPath(AuthType.Login),
        },
      ],
      [
        true,
        {
          id: "register",
          title: register,
          icon: "leaf",
          url: RouteMap.AuthPage.getPath(AuthType.Register),
        },
      ],
      [
        enableInstallInstructions,
        {
          id: "download",
          title: download,
          icon: "cloud-download",
          url: RouteMap.DownloadAndInstallPage.getPath(),
        },
      ],
      [
        enableContribution,
        {
          id: "contribute",
          title: contribute,
          icon: "heart",
          url: RouteMap.ContributePage.getPath(),
        },
      ],
      [
        true,
        {
          id: "settings",
          title: settings,
          icon: "settings",
          url: RouteMap.SettingsPage.getPath(),
        },
      ],
      [
        true,
        {
          id: "about",
          title: about,
          icon: "help-buoy",
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
          icon: "book",
          url: RouteMap.HomePage.getPath("main"),
        },
      ],
      [
        true,
        {
          id: "labels",
          title: labels,
          icon: "pricetag",
          url: RouteMap.LabelsPage.getPath(),
        },
      ],
      [
        true,
        {
          id: "people",
          title: people,
          icon: "people",
          url: RouteMap.PeoplePage.getPath(),
        },
      ],
      [
        enableAssistant,
        {
          id: "assistant",
          title: assistant,
          icon: "chatbox-ellipses",
          url: RouteMap.AssistantPage.getPath(),
        },
      ],
      [
        true,
        {
          id: "messages",
          title: messages,
          icon: "chatbubbles",
          url: RouteMap.MessagesPage.getPath(),
        },
      ],
      [
        true,
        {
          id: "inbox",
          title: inbox,
          icon: "mail",
          url: RouteMap.HomePage.getPath("inbox"),
        },
      ],
      [
        true,
        {
          id: "newrecipe",
          title: newrecipe,
          icon: "add",
          url: RouteMap.EditRecipePage.getPath("new"),
        },
      ],
      [
        true,
        {
          id: "shopping",
          title: shopping,
          icon: "cart",
          url: RouteMap.ShoppingListsPage.getPath(),
        },
      ],
      [
        true,
        {
          id: "meals",
          title: meals,
          icon: "calendar",
          url: RouteMap.MealPlansPage.getPath(),
        },
      ],
      [
        enableInstallInstructions,
        {
          id: "download",
          title: download,
          icon: "cloud-download",
          url: RouteMap.DownloadAndInstallPage.getPath(),
        },
      ],
      [
        enableContribution,
        {
          id: "contribute",
          title: contribute,
          icon: "heart",
          url: RouteMap.ContributePage.getPath(),
        },
      ],
      [
        true,
        {
          id: "settings",
          title: settings,
          icon: "settings",
          url: RouteMap.SettingsPage.getPath(),
        },
      ],
      [
        true,
        {
          id: "about",
          title: about,
          icon: "help-buoy",
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

    const response = await this.recipeService.count({ folder: "inbox" });
    if (!response.success) return;

    this.inboxCount = response.data.count;
  }

  async loadFriendRequestCount() {
    if (!localStorage.getItem("token")) return;

    const response = await this.userService.getMyFriends({
      401: () => {},
    });
    if (!response.success) return;

    this.friendRequestCount = response.data.incomingRequests?.length || null;
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.menuCtrl.close();
    });

    let currentUrl: string | undefined;
    this.router.events.subscribe((event) => {
      if (!(event instanceof NavigationEnd)) return;

      this.updateIsLoggedIn();
      this.updateNavList();

      this.checkBrowserCompatibility();

      try {
        const viewName = event.url;

        const _paq = (window as any)._paq;

        if (!_paq) return;

        if (currentUrl) _paq.push(["setReferrerUrl", currentUrl]);
        currentUrl = "" + window.location.hash.substring(1);
        _paq.push(["setCustomUrl", currentUrl]);
        _paq.push(["setDocumentTitle", viewName]);

        // remove all previously assigned custom variables, requires Matomo (formerly Piwik) 3.0.2
        _paq.push(["deleteCustomVariables", "page"]);
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
}
