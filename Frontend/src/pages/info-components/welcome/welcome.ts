import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';

@IonicPage({
  segment: 'welcome',
  priority: 'high',
})
@Component({
  selector: 'page-welcome',
  templateUrl: 'welcome.html',
})
export class WelcomePage {

  constructor(public navCtrl: NavController, public navParams: NavParams) {
    if (localStorage.getItem('token')) {
      this.navCtrl.setRoot('HomePage', { folder: 'main' }, {animate: false, direction: 'forward'});
    }
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad WelcomePage');
  }
  
  goToAuth(type) {
    let register = type === 'register';

    this.navCtrl.push('LoginPage', {
      register: register
    });
  }

}
