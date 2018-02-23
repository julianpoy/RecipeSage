import { Component, ViewChild } from '@angular/core';
import { Nav, Platform } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  @ViewChild(Nav) nav: Nav;

  rootPage: any;

  pages: Array<{title: string, component: any}>;

  constructor(public platform: Platform, public statusBar: StatusBar, public splashScreen: SplashScreen) {
    this.initializeApp();
    
    if(localStorage.getItem('token')) {
      this.rootPage = 'HomePage';
    }else{
      this.rootPage = 'LoginPage';
    }
  }
  
  navList() {
    var pages = [];
    
    var loggedOutPages = [
      { title: 'Login', component: 'LoginPage' }
    ];

    var loggedInPages = [
      { title: 'My Recipes', component: 'HomePage' },
      { title: 'My Labels', component: 'RecipesByLabelPage' },
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

  initializeApp() {
    this.platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      this.statusBar.styleDefault();
      this.splashScreen.hide();
    });
  }

  openPage(page) {
    // Reset the content nav to have just this page
    // we wouldn't want the back button to show in this scenario
    this.nav.setRoot(page.component);
  }
}
