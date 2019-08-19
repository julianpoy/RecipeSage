import { Component } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';

import { Platform, MenuController, ToastController, AlertController, NavController, Events } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';

import { UtilService, RouteMap } from '@/services/util.service';
import { RecipeService } from '@/services/recipe.service';
import { MessagingService } from '@/services/messaging.service';
import { WebsocketService } from '@/services/websocket.service';
import { UserService } from '@/services/user.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html'
})
export class AppComponent {
  isLoggedIn: boolean;

  navList: { title: string, icon: string, url: string }[];

  inboxCount: number;

  version: number = (<any>window).version;

  unsupportedBrowser: boolean = !!window.navigator.userAgent.match(/(MSIE|Trident)/);
  seenOldBrowserWarning: boolean = !!localStorage.getItem('seenOldBrowserWarning');

  constructor(
    private navCtrl: NavController,
    private route: ActivatedRoute,
    private router: Router,
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    private menuCtrl: MenuController,
    private events: Events,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private utilService: UtilService,
    private recipeService: RecipeService,
    private messagingService: MessagingService,
    private websocketService: WebsocketService,
    private userService: UserService
  ) {

    this.initializeApp();

    this.loadInboxCount();
    this.initUpdateListeners();
    this.initEventListeners();
    this.initEventDispatchers();

    if ('Notification' in window && (<any>Notification).permission === 'granted' && this.utilService.isLoggedIn()) {
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
        message: 'It looks like you\'re using an old browser that isn\'t supported. Some functionality may not work or may be broken.<br /><br />Please switch to a modern browser such as Google Chrome or Firefox for full functionality.',
        buttons: [
          {
            text: 'Dismiss',
            handler: () => {
              this.seenOldBrowserWarning = true;
              localStorage.setItem('seenOldBrowserWarning', "true");
            }
          }
        ]
      });

      oldBrowserAlert.present();
    }
  }

  initUpdateListeners() {
    // When user pauses app (device locks, switches tabs, etc) try to update SW
    this.events.subscribe('application:multitasking:paused', () => {
      try {
        (<any>window).updateSW();
      } catch (e) { }
    });

    window['onSWUpdate'] = () => {
      console.log("Update is waiting for pause...")
      if ((<any>window).isHidden()) {
        (<any>window).location.reload(true);
      } else {
        this.events.subscribe('application:multitasking:paused', () => {
          (<any>window).location.reload(true);
        });
      }
    };
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
      var notification = 'New message from ' + (payload.otherUser.name || payload.otherUser.email);

      var myMessage = payload;

      let toast = await this.toastCtrl.create({
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

    this.websocketService.register('import:pepperplate:complete', payload => {
      this.events.publish('import:pepperplate:complete');
    }, this);

    this.websocketService.register('import:pepperplate:failed', payload => {
      this.events.publish('import:pepperplate:failed', payload.reason);
    }, this);

    this.websocketService.register('import:pepperplate:working', payload => {
      this.events.publish('import:pepperplate:working');
    }, this);

    this.events.subscribe('import:pepperplate:complete', async () => {
      var notification = 'Your recipes have been imported from Pepperplate.';

      let toast = await this.toastCtrl.create({
        message: notification,
        duration: 10000,
        showCloseButton: true,
        closeButtonText: 'Close'
      });
      toast.present();
    });

    this.events.subscribe('import:pepperplate:failed', async reason => {
      var notification = '';
      if (reason === 'timeout') {
        notification += 'Import failed: The Pepperplate API is unavailable right now.';
      } else if (reason === 'invalidCredentials') {
        notification += 'Import failed: Incorrect Pepperplate username or password.';
      } else if (reason === 'saving') {
        notification += 'Import failed: An error occured while fetching the recipes. Please try again later.';
      } else {
        return;
      }

      let toast = await this.toastCtrl.create({
        message: notification,
        showCloseButton: true,
        closeButtonText: 'Close'
      });
      toast.present();
    });

    this.events.subscribe('import:pepperplate:working', async () => {
      var notification = 'Your Pepperplate recipes are being imported into RecipeSage. We\'ll alert you when the process is complete.';

      let toast = await this.toastCtrl.create({
        message: notification,
        showCloseButton: true,
        closeButtonText: 'Close'
      });
      toast.present();
    });
  }

  initEventDispatchers() {
    var hidden, visibilityChange;
    if (typeof (<any>document).hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support
      hidden = "hidden";
      visibilityChange = "visibilitychange";
    } else if (typeof (<any>document).msHidden !== "undefined") {
      hidden = "msHidden";
      visibilityChange = "msvisibilitychange";
    } else if (typeof (<any>document).webkitHidden !== "undefined") {
      hidden = "webkitHidden";
      visibilityChange = "webkitvisibilitychange";
    }

    (<any>window).isHidden = () => {
      return document[hidden];
    }

    document.addEventListener(visibilityChange, () => {
      if (document[hidden]) {
        this.events.publish('application:multitasking:paused');
      } else {
        this.events.publish('application:multitasking:resumed');
      }
    }, false);
  }

  updateIsLoggedIn() {
    this.isLoggedIn = this.utilService.isLoggedIn();
  }

  updateNavList() {
    this.navList = this.generateNavList();
  }

  generateNavList() {
    var pages = [];

    var loggedOutPages = [
      { title: 'Welcome', icon: 'sunny', url: '/welcome' },
      { title: 'Log In', icon: 'ios-nutrition', url: '/login' },
      { title: 'Create an Account', icon: 'ios-leaf', url: '/register', navData: { register: true } },
      { title: 'Contribute!', icon: 'heart', url: '/contribute' },
      { title: 'About & Support', icon: 'help-buoy', url: '/about' }
    ];

    var loggedInPages = [
      { title: 'My Recipes', icon: 'book', url: '/list/main' },
      { title: 'Messages', icon: 'chatboxes', url: '/messages' },
      { title: 'Recipe Inbox', icon: 'mail', url: '/list/inbox' },
      { title: 'Create Recipe', icon: 'md-add', url: '/edit-recipe/new' },
      { title: 'Shopping Lists', icon: 'cart', url: '/shopping-lists' },
      { title: 'Meal Plans', icon: 'calendar', url: '/meal-planners' },
      { title: 'Contribute!', icon: 'heart', url: '/contribute' },
      { title: 'Settings', icon: 'settings', url: '/settings' },
      { title: 'About & Support', icon: 'help-buoy', url: '/about' }
    ];

    if (this.utilService.isLoggedIn()) {
      pages = pages.concat(loggedInPages);
    } else {
      pages = pages.concat(loggedOutPages);
    }

    return pages;
  }

  readyForPrompt() {
    return !!(<any>window).deferredInstallPrompt;
  }

  showInstallPrompt() {
    let installPrompt = (<any>window).deferredInstallPrompt;
    if (installPrompt) {
      installPrompt.prompt();

      installPrompt.userChoice
        .then(choiceResult => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the A2HS prompt');
            (<any>window).deferredInstallPrompt = null;
          } else {
            console.log('User dismissed the A2HS prompt');
          }
        });
    }
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
        let viewName = event.url;

        let _paq = (<any>window)._paq;

        if (currentUrl) _paq.push(['setReferrerUrl', currentUrl]);
        currentUrl = '' + window.location.hash.substr(1);
        _paq.push(['setCustomUrl', currentUrl]);
        _paq.push(['setDocumentTitle', viewName]);

        // remove all previously assigned custom variables, requires Matomo (formerly Piwik) 3.0.2
        _paq.push(['deleteCustomVariables', 'page']);
        _paq.push(['setGenerationTimeMs', 0]);
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
