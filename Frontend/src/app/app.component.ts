import { Component } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';

import { Platform, MenuController, ToastController, AlertController, NavController } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';

import { ENABLE_ANALYTICS, IS_SELFHOST } from '../environments/environment';

import { UtilService, RouteMap, AuthType } from '@/services/util.service';
import { RecipeService } from '@/services/recipe.service';
import { MessagingService } from '@/services/messaging.service';
import { WebsocketService } from '@/services/websocket.service';
import { UserService } from '@/services/user.service';
import { PreferencesService, GlobalPreferenceKey } from '@/services/preferences.service';
import { CapabilitiesService } from '@/services/capabilities.service';
import { VersionCheckService } from '@/services/versioncheck.service';
import { CookingToolbarService } from '@/services/cooking-toolbar.service';
import { EventService } from '@/services/event.service';
import { OfflineCacheService } from '@/services/offline-cache.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html'
})
export class AppComponent {
  isSelfHost = IS_SELFHOST;
  isLoggedIn: boolean;

  navList: { title: string, icon: string, url: string }[];

  inboxCount: number;

  version: number = (window as any).version;

  unsupportedBrowser: boolean = !!window.navigator.userAgent.match(/(MSIE|Trident)/);
  seenOldBrowserWarning: boolean = !!localStorage.getItem('seenOldBrowserWarning');

  aboutDetailsHref: string = RouteMap.AboutDetailsPage.getPath();

  preferences = this.preferencesService.preferences;
  preferenceKeys = GlobalPreferenceKey;

  constructor(
    private navCtrl: NavController,
    private route: ActivatedRoute,
    private router: Router,
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
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
    private capabilitiesService: CapabilitiesService,
    private versionCheckService: VersionCheckService,
    private offlineCacheService: OfflineCacheService,
    public cookingToolbarService: CookingToolbarService,
  ) {

    if (ENABLE_ANALYTICS) {
      this.initAnalytics();
    }

    this.initializeApp();

    this.loadInboxCount();
    this.initUpdateListeners();
    this.initEventListeners();

    if ('Notification' in window && (Notification as any).permission === 'granted' && this.utilService.isLoggedIn()) {
      this.messagingService.requestNotifications();
    }

    this.updateNavList();
    this.updateIsLoggedIn();
  }

  // Attached to pagechange so keep this light
  async checkBrowserCompatibility() {
    if (this.unsupportedBrowser && !this.seenOldBrowserWarning && this.utilService.isLoggedIn()) {
      const oldBrowserAlert = await this.alertCtrl.create({
        header: 'Unsupported Browser',
        message: `It looks like you\'re using an old browser that isn\'t supported. Some functionality may not work or may be broken.
                  <br /><br />Please switch to a modern browser such as Google Chrome or Firefox for full functionality.`,
        buttons: [
          {
            text: 'Dismiss',
            handler: () => {
              this.seenOldBrowserWarning = true;
              localStorage.setItem('seenOldBrowserWarning', 'true');
            }
          }
        ]
      });

      oldBrowserAlert.present();
    }
  }

  initAnalytics() {
    const _paq = (window as any)._paq || [];

    /* tracker methods like "setCustomDimension" should be called before "trackPageView" */
    // _paq.push(['trackPageView']);
    _paq.push(['enableLinkTracking']);

    const u = '//a.recipesage.com/';
    _paq.push(['setTrackerUrl', u + 'piwik.php']);
    _paq.push(['setSiteId', '1']);
    const g = document.createElement('script');
    const s = document.getElementsByTagName('script')[0];
    g.type = 'text/javascript';
    g.async = true;
    g.defer = true;
    g.src = u + 'piwik.js';
    s.parentNode.insertBefore(g, s);

    (window as any)._paq = _paq;
  }

  initUpdateListeners() {
    (window as any).appLoaded = true;
  }

  initEventListeners() {
    this.events.subscribe('recipe:created', () => {
      this.loadInboxCount();
    });

    this.events.subscribe('recipe:updated', () => {
      this.loadInboxCount();
    });

    this.events.subscribe('recipe:deleted', () => {
      this.loadInboxCount();
    });

    this.websocketService.register('messages:new', async payload => {
      if (this.route.snapshot.url.toString().indexOf(RouteMap.MessagesPage.getPath())) return;
      const notification = 'New message from ' + (payload.otherUser.name || payload.otherUser.email);

      const myMessage = payload;

      const toast = await this.toastCtrl.create({
        message: notification,
        duration: 7000,
        buttons: [{
          text: 'View',
          role: 'cancel',
          handler: () => {
            this.navCtrl.navigateForward(RouteMap.MessageThreadPage.getPath(myMessage.otherUser.id));
          }
        }]
      });
      toast.present();
    }, this);
  }

  updateIsLoggedIn() {
    this.isLoggedIn = this.utilService.isLoggedIn();
  }

  updateNavList() {
    this.navList = this.generateNavList();
  }

  generateNavList() {
    let pages = [];

    const loggedOutPages = [
      { title: 'Welcome', icon: 'sunny', url: RouteMap.WelcomePage.getPath() },
      { title: 'Log In', icon: 'log-in', url: RouteMap.AuthPage.getPath(AuthType.Login) },
      { title: 'Create an Account', icon: 'leaf', url: RouteMap.AuthPage.getPath(AuthType.Register) },
      { title: 'Download and Install', icon: 'cloud-download', url: RouteMap.DownloadAndInstallPage.getPath() },
      { title: 'Contribute!', icon: 'heart', url: RouteMap.ContributePage.getPath() },
      { title: 'About & Support', icon: 'help-buoy', url: RouteMap.AboutPage.getPath() }
    ];

    const loggedInPages = [
      { title: 'My Recipes', icon: 'book', url: RouteMap.HomePage.getPath('main') },
      { title: 'Manage Labels', icon: 'pricetag', url: RouteMap.LabelsPage.getPath() },
      ...(this.isSelfHost ? [] : [{ title: 'People & Profile', icon: 'people', url: RouteMap.PeoplePage.getPath() }]),
      { title: 'Messages', icon: 'chatbox', url: RouteMap.MessagesPage.getPath() },
      { title: 'Recipe Inbox', icon: 'mail', url: RouteMap.HomePage.getPath('inbox') },
      { title: 'Create Recipe', icon: 'add', url: RouteMap.EditRecipePage.getPath('new') },
      { title: 'Shopping Lists', icon: 'cart', url: RouteMap.ShoppingListsPage.getPath() },
      { title: 'Meal Plans', icon: 'calendar', url: RouteMap.MealPlansPage.getPath() },
      { title: 'Download and Install', icon: 'cloud-download', url: RouteMap.DownloadAndInstallPage.getPath() },
      { title: 'Contribute!', icon: 'heart', url: RouteMap.ContributePage.getPath() },
      { title: 'Settings', icon: 'settings', url: RouteMap.SettingsPage.getPath() },
      { title: 'About & Support', icon: 'help-buoy', url: RouteMap.AboutPage.getPath() }
    ];

    if (this.utilService.isLoggedIn()) {
      pages = pages.concat(loggedInPages);
    } else {
      pages = pages.concat(loggedOutPages);
    }

    return pages;
  }

  loadInboxCount() {
    if (!localStorage.getItem('token')) return;

    this.recipeService.count({ folder: 'inbox' }).then(response => {
      this.inboxCount = response.count;

      this.events.publish('recipe:inbox:count', this.inboxCount);
    }, () => { });
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
      this.menuCtrl.close();
    });

    let currentUrl;
    this.router.events.subscribe((event) => {
      if (!(event instanceof NavigationEnd)) return;

      this.updateNavList();
      this.updateIsLoggedIn();

      this.checkBrowserCompatibility();

      try {
        const viewName = event.url;

        const _paq = (window as any)._paq;

        if (!_paq) return;

        if (currentUrl) _paq.push(['setReferrerUrl', currentUrl]);
        currentUrl = '' + window.location.hash.substr(1);
        _paq.push(['setCustomUrl', currentUrl]);
        _paq.push(['setDocumentTitle', viewName]);

        // remove all previously assigned custom variables, requires Matomo (formerly Piwik) 3.0.2
        _paq.push(['deleteCustomVariables', 'page']);
        _paq.push(['trackPageView']);

        // make Matomo aware of newly added content
        _paq.push(['MediaAnalytics::scanForMedia']);
        _paq.push(['FormAnalytics::scanForForms']);
        _paq.push(['trackContentImpressionsWithinNode']);
        _paq.push(['enableLinkTracking']);
      } catch (e) {
        console.warn(e);
      }
    });
  }

  _logout() {
    this.utilService.removeToken();

    this.navCtrl.navigateRoot(RouteMap.WelcomePage.getPath());
  }

  logout() {
    this.messagingService.disableNotifications();

    this.userService.logout().then(() => {
      this._logout();
    }, async err => {
      switch (err.response.status) {
        case 0:
        case 401:
        case 404:
          this._logout();
          break;
        default:
          const errorToast = await this.toastCtrl.create({
            message: this.utilService.standardMessages.unexpectedError,
            duration: 6000
          });
          errorToast.present();
          break;
      }
    });
  }
}
