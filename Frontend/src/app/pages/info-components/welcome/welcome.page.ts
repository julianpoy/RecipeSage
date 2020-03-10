import { Component } from '@angular/core';
import { NavController, Platform } from '@ionic/angular';
import { RouteMap, AuthType } from '@/services/util.service';

@Component({
  selector: 'page-welcome',
  templateUrl: 'welcome.page.html',
  styleUrls: ['welcome.page.scss']
})
export class WelcomePage {
  isIOS: boolean = this.platform.is('ios');
  isCapacitor: boolean = this.platform.is('capacitor');

  constructor(
    public navCtrl: NavController,
    public platform: Platform
  ) {
    if (localStorage.getItem('token')) {
      this.navCtrl.navigateRoot(RouteMap.HomePage.getPath('main'));
    }
  }

  goToAuth(type) {
    const register = type === 'register';

    if (register) {
      this.navCtrl.navigateRoot(RouteMap.AuthPage.getPath(AuthType.Register));
    } else {
      this.navCtrl.navigateRoot(RouteMap.AuthPage.getPath(AuthType.Login));
    }
  }

}
