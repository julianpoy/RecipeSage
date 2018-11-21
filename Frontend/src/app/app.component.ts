import { Component, ViewChild } from '@angular/core';
import { Nav, Platform, Events, ToastController } from 'ionic-angular';

import { MessagesPage } from '../pages/messaging-components/messages/messages';
import { MessageThreadPage } from '../pages/messaging-components/message-thread/message-thread';

import { RecipeServiceProvider } from '../providers/recipe-service/recipe-service';
import { UserServiceProvider } from '../providers/user-service/user-service';
import { MessagingServiceProvider } from '../providers/messaging-service/messaging-service';
import { WebsocketServiceProvider } from '../providers/websocket-service/websocket-service';
import { UtilServiceProvider } from '../providers/util-service/util-service';

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  @ViewChild(Nav) nav: Nav;

  rootPage: string = localStorage.getItem('token') ? 'HomePage' : 'WelcomePage';
  rootPageParams: any = { folder: 'main' };

  pages: Array<{title: string, component: any}>;

  inboxCount: number;

  version: number = (<any>window).version;

  constructor(
    public platform: Platform,
    public events: Events,
    public toastCtrl: ToastController,
    public utilService: UtilServiceProvider,
    public recipeService: RecipeServiceProvider,
    public messagingService: MessagingServiceProvider,
    public websocketService: WebsocketServiceProvider,
    public userService: UserServiceProvider) {

    this.initializeApp();

    this.loadInboxCount();
    this.initUpdateListeners();
    this.initEventListeners();
    this.initEventDispatchers();
    this.initDevBase();

    if ('Notification' in window && (<any>Notification).permission === 'granted' && this.isLoggedIn()) {
      this.messagingService.requestNotifications();
    }
  }

  initUpdateListeners() {
    // When user pauses app (device locks, switches tabs, etc) try to update SW
    this.events.subscribe('application:multitasking:paused', () => {
      (<any>window).updateSW();
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

    this.websocketService.register('messages:new', payload => {
      if (this.nav.getActive().instance instanceof MessageThreadPage || this.nav.getActive().instance instanceof MessagesPage) return;
      var notification = 'New message from ' + (payload.otherUser.name || payload.otherUser.email);

      var myMessage = payload;

      let toast = this.toastCtrl.create({
        message: notification,
        duration: 7000,
        showCloseButton: true,
        closeButtonText: 'View'
      });
      toast.present();

      toast.onDidDismiss((data, role) => {
        console.log('Dismissed toast');
        if (role == "close") {
          this.nav.setRoot('MessageThreadPage', { otherUserId: myMessage.otherUser.id });
        }
      });
    }, this);

    this.events.subscribe('import:pepperplate:complete', message => {
      var notification = 'Your recipes have been imported from Pepperplate.';

      let toast = this.toastCtrl.create({
        message: notification,
        duration: 10000,
        showCloseButton: true,
        closeButtonText: 'Close'
      });
      toast.present();
    });

    this.events.subscribe('import:pepperplate:failed', reason => {
      var notification = '';
      if (reason === 'timeout') {
        notification += 'Import failed: Pepperplate service is unavailable right now.';
      } else if (reason === 'invalidCredentials') {
        notification += 'Import failed: Incorrect Pepperplate username or password.';
      } else if (reason === 'saving') {
        notification += 'Import failed: An error occured while fetching the recipes. Please try again later.';
      } else {
        return;
      }

      let toast = this.toastCtrl.create({
        message: notification,
        duration: 15000,
        showCloseButton: true,
        closeButtonText: 'Close'
      });
      toast.present();
    });

    this.events.subscribe('import:pepperplate:working', message => {
      var notification = 'Your Pepperplate recipes are being imported into RecipeSage. We\'ll alert you when the process is complete.';

      let toast = this.toastCtrl.create({
        message: notification,
        duration: 7000,
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

  initDevBase() {
    if (window.location.href.toLowerCase().indexOf('devbox.julianjp.com') > -1) {
      localStorage.setItem('base', 'http://devbox.julianjp.com:3000/');
    } else if (window.location.href.toLowerCase().indexOf('julianjp.com') > -1) {
      localStorage.setItem('base', 'https://julianjp.com/chefbook-backend/');
    } else if (window.location.href.toLowerCase().indexOf('localhost') > -1) {
      localStorage.setItem('base', 'http://localhost:3000/');
    } else if (window.location.href.toLowerCase().indexOf(':8100') > -1) {
      localStorage.setItem('base', window.location.protocol + '//' + window.location.hostname + ':3000/');
    }
  }

  navList() {
    var pages = [];

    var loggedOutPages = [
      { title: 'Welcome', component: 'WelcomePage' },
      { title: 'Log In', component: 'LoginPage' },
      { title: 'Create an Account', component: 'LoginPage', navData: { register: true } },
      { title: 'About & Support', component: 'AboutPage' }
    ];

    var loggedInPages = [
      { title: 'My Recipes', component: 'HomePage', navData: { folder: 'main' } },
      // { title: 'My Labels', component: 'RecipesByLabelPage' },
      { title: 'Messages', component: 'MessagesPage' },
      { title: 'Recipe Inbox', component: 'HomePage', navData: { folder: 'inbox' } },
      { title: 'Create Recipe', component: 'EditRecipePage' },
      { title: 'Shopping Lists', component: 'ShoppingListsPage' },
      { title: 'Meal Plans', component: 'MealPlansPage' },
      { title: 'Settings', component: 'SettingsPage' },
      { title: 'About & Support', component: 'AboutPage' }
    ];

    if (this.isLoggedIn()) {
      pages = pages.concat(loggedInPages);
    } else {
      pages = pages.concat(loggedOutPages);
    }

    return pages;
  }

  isLoggedIn() {
    return localStorage.getItem('token') ? true : false;
  }

  loadInboxCount() {
    if (!localStorage.getItem('token')) return;

    this.recipeService.fetch({ folder: 'inbox' }).subscribe(response => {
      this.inboxCount = response.length;

      this.events.publish('recipe:inbox:count', this.inboxCount);
    }, () => {});
  }

  initializeApp() {
    // this.splashScreen.hide();
    this.platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      // this.statusBar.styleDefault();

      // if(localStorage.getItem('token')) {
      //   this.nav.setRoot('HomePage', { folder: 'main' });
      // }else{
      //   this.nav.setRoot('LoginPage');
      // }
    });
  }

  openPage(page) {
    // Reset the content nav to have just this page
    // we wouldn't want the back button to show in this scenario
    this.nav.setRoot(page.component, page.navData);
  }

  _logout() {

    localStorage.removeItem('token');

    this.openPage({
      component: 'WelcomePage',
      navData: {}
    });
  }

  logout() {
    this.messagingService.disableNotifications();

    this.userService.logout().subscribe(() => {
      this._logout();
    }, err => {
      switch (err.status) {
        case 0:
        case 401:
        case 404:
          this._logout();
          break;
        default:
          this.toastCtrl.create({
            message: this.utilService.standardMessages.unexpectedError,
            duration: 6000
          }).present();
          break;
      }
    });
  }
}
