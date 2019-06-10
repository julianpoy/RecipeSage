import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'page-welcome',
  templateUrl: 'welcome.page.html',
  styleUrls: ['welcome.page.scss']
})
export class WelcomePage {

  constructor(public navCtrl: NavController) {
    if (localStorage.getItem('token')) {
      // this.navCtrl.setRoot('HomePage', { folder: 'main' }, {animate: false, direction: 'forward'});
    }
  }

  goToAuth(type) {
    let register = type === 'register';

    // this.navCtrl.push('LoginPage', {
    //   register: register
    // });
  }

}
