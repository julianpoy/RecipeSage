import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';
import { RouteMap } from '@/services/util.service';

@Component({
  selector: 'page-welcome',
  templateUrl: 'welcome.page.html',
  styleUrls: ['welcome.page.scss']
})
export class WelcomePage {

  constructor(public navCtrl: NavController) {
    if (localStorage.getItem('token')) {
      this.navCtrl.navigateRoot(RouteMap.HomePage.getPath('main'));
    }
  }

  goToAuth(type) {
    let register = type === 'register';

    if (register) this.navCtrl.navigateForward(RouteMap.LoginPage.getPath());
    else this.navCtrl.navigateForward(RouteMap.LoginPage.getPath());
    // TODO: Route to correct pages
  }

}
