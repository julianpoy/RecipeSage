import { Component, ViewChild } from '@angular/core';
import { Nav, Platform, Events, ToastController } from 'ionic-angular';

import { MessagesPage } from '../pages/messages/messages';
import { MessageThreadPage } from '../pages/message-thread/message-thread';

import { RecipeServiceProvider } from '../providers/recipe-service/recipe-service';
import { UserServiceProvider } from '../providers/user-service/user-service';
import { MessagingServiceProvider } from '../providers/messaging-service/messaging-service';

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  @ViewChild(Nav) nav: Nav;
  
  rootPage: string = 'WelcomePage';
  // rootPageParams: any = { folder: 'main' };

  pages: Array<{title: string, component: any}>;
  
  inboxCount: number;
  
  version: number = (<any>window).version;

  constructor(
    public platform: Platform,
    public events: Events,
    public toastCtrl: ToastController,
    public recipeService: RecipeServiceProvider,
    public messagingService: MessagingServiceProvider,
    public userService: UserServiceProvider) {
    
    this.initializeApp();

    this.loadInboxCount();
    this.initUpdateListeners();
    this.initEventListeners();
    this.initEventDispatchers();
    this.initDevBase();
  }
  
  initUpdateListeners() {
    var me = this;

    // When user pauses app (device locks, switches tabs, etc) try to update SW
    this.events.subscribe('application:multitasking:paused', () => {
      setTimeout(function() {
        (<any>window).updateSW();
      });
    });

    window['onSWUpdate'] = function() {
		  console.log("Update is waiting for pause...")
		  if ((<any>window).isHidden()) {
  	    (<any>window).location.reload(true);
		  } else {
  		  me.events.subscribe('application:multitasking:paused', () => {
    	    (<any>window).location.reload(true);
        });
		  }
  	};
  }
  
  initEventListeners() {
    var me = this;

    this.events.subscribe('recipe:created', () => {
      this.loadInboxCount();
    });
    
    this.events.subscribe('recipe:updated', () => {
      this.loadInboxCount();
    });
    
    this.events.subscribe('recipe:deleted', () => {
      this.loadInboxCount();
    });
    
    this.events.subscribe('messages:new', (message) => {
      if (me.nav.getActive().instance instanceof MessageThreadPage || me.nav.getActive().instance instanceof MessagesPage) return;
      var notification = 'New message from ' + (message.otherUser.name || message.otherUser.email);
      
      var myMessage = message;
      
      let toast = me.toastCtrl.create({
        message: notification,
        duration: 7000,
        showCloseButton: true,
        closeButtonText: 'View'
      });
      toast.present();
      
      toast.onDidDismiss((data, role) => {    
        console.log('Dismissed toast');
        if (role == "close") {
          me.nav.setRoot('MessageThreadPage', { otherUserId: myMessage.otherUser._id });
        }
      });
    });
    
    this.events.subscribe('import:pepperplate:complete', (message) => {
      var notification = 'Your recipes have been imported from Pepperplate.';
      
      let toast = me.toastCtrl.create({
        message: notification,
        duration: 10000,
        showCloseButton: true,
        closeButtonText: 'Close'
      });
      toast.present();
    });
    
    this.events.subscribe('import:pepperplate:failed', (reason) => {
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
      
      let toast = me.toastCtrl.create({
        message: notification,
        duration: 15000,
        showCloseButton: true,
        closeButtonText: 'Close'
      });
      toast.present();
    });
    
    this.events.subscribe('import:pepperplate:working', (message) => {
      var notification = 'Your Pepperplate recipes are being imported into RecipeSage. We\'ll alert you when the process is complete.';
      
      let toast = me.toastCtrl.create({
        message: notification,
        duration: 7000,
        showCloseButton: true,
        closeButtonText: 'Close'
      });
      toast.present();
    });
  }
  
  initEventDispatchers() {
    var me = this;

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
    
    (<any>window).isHidden = function() {
      return document[hidden];
    }
    
    document.addEventListener(visibilityChange, function() {
      if (document[hidden]) {
        me.events.publish('application:multitasking:paused');
      } else {
        me.events.publish('application:multitasking:resumed');
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
    var me = this;

    if (!localStorage.getItem('token')) return;

    this.recipeService.fetch({ folder: 'inbox' }).subscribe(function(response) {
      me.inboxCount = response.length;
      
      me.events.publish('recipe:inbox:count', me.inboxCount);
    }, function() {});
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

    var me = this;
    this.userService.logout().subscribe(function() {
      me._logout.call(me);
    }, function(err) {
      switch (err.status) {
        case 0:
        case 401:
        case 404:
          me._logout.call(me);
          break;
        default:
          me.toastCtrl.create({
            message: 'An unexpected error occured. Please try again.',
            duration: 6000
          }).present();
          break;
      }
    });
  }
}
