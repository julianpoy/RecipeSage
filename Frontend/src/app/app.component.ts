import { Component, ViewChild } from '@angular/core';
import { Nav, Platform, Events, ToastController } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';

import { MessagesPage } from '../pages/messages/messages';
import { MessageThreadPage } from '../pages/message-thread/message-thread';

import { RecipeServiceProvider } from '../providers/recipe-service/recipe-service';
import { UserServiceProvider } from '../providers/user-service/user-service';

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
    public statusBar: StatusBar,
    public events: Events,
    public splashScreen: SplashScreen,
    public toastCtrl: ToastController,
    public recipeService: RecipeServiceProvider,
    public userService: UserServiceProvider) {
    
    this.initializeApp();

    this.loadInboxCount();
    this.checkForUpdate();
    this.initEventListeners();
    this.initEventDispatchers();
    this.initDevBase();
  }
  
  checkForUpdate() {
    var toast;
    
    var me = this;
    function promptToUpdate() {
      if (toast) return;

      toast = me.toastCtrl.create({
  			message: 'New update available!',
  			position: 'bottom',
  			showCloseButton: true,
  			closeButtonText: "Update"
  		});
  		toast.onDidDismiss(() => {
  	    (<any>window).location.reload(true);
      });
  		toast.present();
    }

    window['isUpdateAvailable']
  	.then(isAvailable => {
  		if (isAvailable) {
  		  promptToUpdate();
  		}
  	});
  	this.userService.checkForUpdate({
      version: (<any>window).version
    }).subscribe(function(response) {
      if (response.updateAvailable) {
        promptToUpdate();
      }
    }, function() {});
  }
  
  initEventListeners() {
    var me = this;

    events.subscribe('recipe:created', () => {
      this.loadInboxCount();
    });
    
    events.subscribe('recipe:updated', () => {
      this.loadInboxCount();
    });
    
    events.subscribe('recipe:deleted', () => {
      this.loadInboxCount();
    });
    
    events.subscribe('messages:new', (message) => {
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
    
    events.subscribe('import:pepperplate:complete', (message) => {
      var notification = 'Your recipes have been imported from Pepperplate.';
      
      let toast = me.toastCtrl.create({
        message: notification,
        duration: 10000,
        showCloseButton: true,
        closeButtonText: 'Close'
      });
      toast.present();
    });
    
    events.subscribe('import:pepperplate:failed', (reason) => {
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
    
    events.subscribe('import:pepperplate:working', (message) => {
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
    
    document.addEventListener(visibilityChange, function() {
      if (document[hidden]) {
        me.events.publish('application:multitasking:paused');
      } else {
        me.events.publish('application:multitasking:resumed');
      }
    }, false);
  }
  
  initDevBase() {
    if (window.location.href.toLowerCase().indexOf('dev') > -1) {
      localStorage.setItem('base', 'http://devbox.julianjp.com:3000/');
    } else if (window.location.href.toLowerCase().indexOf('julianjp.com') > -1) {
      localStorage.setItem('base', 'https://julianjp.com/chefbook-backend/');
    }
  }
  
  navList() {
    var pages = [];
    
    var loggedOutPages = [
      { title: 'Signup/Login', component: 'LoginPage' }
    ];

    var loggedInPages = [
      { title: 'My Recipes', component: 'HomePage', navData: { folder: 'main' } },
      // { title: 'My Labels', component: 'RecipesByLabelPage' },
      { title: 'Messages', component: 'MessagesPage' },
      { title: 'Recipe Inbox', component: 'HomePage', navData: { folder: 'inbox' } },
      { title: 'Create Recipe', component: 'EditRecipePage' },
      { title: 'Settings', component: 'SettingsPage' },
      { title: 'About & Support', component: 'AboutPage' },
      { title: 'Logout', component: 'LoginPage' }
    ];
    
    if (localStorage.getItem('token')) {
      pages = pages.concat(loggedInPages);
    } else {
      pages = pages.concat(loggedOutPages);
    }

    return pages;
  }
  
  loadInboxCount() {
    var me = this;

    this.recipeService.fetch({ folder: 'inbox' }).subscribe(function(response) {
      me.inboxCount = response.length;
      
      me.events.publish('recipe:inbox:count', me.inboxCount);
    }, function() {});
  }

  initializeApp() {
    this.splashScreen.hide();
    this.platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      this.statusBar.styleDefault();
      
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
}
