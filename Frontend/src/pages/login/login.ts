import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';

/**
 * Generated class for the LoginPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-login',
  templateUrl: 'login.html',
})
export class LoginPage {

  showLogin: Boolean;

  constructor(public navCtrl: NavController, public navParams: NavParams) {
  	// code in here will run whenver the component becomes existing
    this.showLogin = true;
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad LoginPage');
    // code in here will run whenver the component loads
  }

  toggleLogin() {
    // when an "instead" button is clicked. Alters visibility of elements.
    this.showLogin = !this.showLogin;
  }

  auth() {
    if (this.showLogin) {
      console.log("Do login here")
    } else {
      console.log("Do signup here")
    }
    // what occurs when "login" button is clicked.
  }

}
