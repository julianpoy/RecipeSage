import { Component, ViewChild } from '@angular/core';
import { Nav, Platform, Events, ToastController } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';

import { RecipeServiceProvider } from '../providers/recipe-service/recipe-service';

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  @ViewChild(Nav) nav: Nav;
  
  rootPage: string = 'HomePage';
  rootPageParams: any = { folder: 'main' };

  pages: Array<{title: string, component: any}>;
  
  inboxCount: number;

  constructor(
    public platform: Platform,
    public statusBar: StatusBar,
    public events: Events,
    public splashScreen: SplashScreen,
    public toastCtrl: ToastController,
    public recipeService: RecipeServiceProvider) {
    this.initializeApp();
    
    // this.navCtrl.setRoot('HomePage', { folder: 'main' });
    
    this.loadInboxCount();
    
    var me = this;
    events.subscribe('recipe:inbox:new', (recipe) => {
      this.loadInboxCount();

      var message = (recipe.fromUser.name || recipe.fromUser.email) + ' sent you a recipe: ' + recipe.title;
      
      let toast = me.toastCtrl.create({
        message: message,
        duration: 7000,
        showCloseButton: true,
        closeButtonText: 'View'
      });
      toast.present();
      
      toast.onDidDismiss((data, role) => {    
        console.log('Dismissed toast');
        if (role== "close") {
          me.nav.setRoot('RecipePage', { recipeId: recipe._id });
        }
      });
    });
    
    events.subscribe('recipe:inbox:deleted', () => {
      this.loadInboxCount();
    });
    
    events.subscribe('recipe:inbox:saved', () => {
      this.loadInboxCount();
    });
  }
  
  navList() {
    var pages = [];
    
    var loggedOutPages = [
      { title: 'Login', component: 'LoginPage' }
    ];

    var loggedInPages = [
      { title: 'My Recipes', component: 'HomePage', navData: { folder: 'main' } },
      { title: 'My Labels', component: 'RecipesByLabelPage' },
      { title: 'Inbox', component: 'HomePage', navData: { folder: 'inbox' } },
      { title: 'Add Recipe', component: 'EditRecipePage' },
      { title: 'Import', component: 'ImportPage' },
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

    this.recipeService.fetch('inbox').subscribe(function(response) {
      me.inboxCount = response.length;
      
      me.events.publish('recipe:inbox:count', me.inboxCount);
    }, function() {});
  }

  initializeApp() {
    this.platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      this.statusBar.styleDefault();
      this.splashScreen.hide();
      
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
