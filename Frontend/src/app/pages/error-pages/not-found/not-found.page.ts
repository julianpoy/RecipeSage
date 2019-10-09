import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';

import { RouteMap } from '@/services/util.service';

@Component({
  selector: 'page-not-found',
  templateUrl: 'not-found.page.html',
  styleUrls: ['not-found.page.scss']
})
export class NotFoundPage {
  constructor(
    private navCtrl: NavController
  ) {}

  goToContact() {
    this.navCtrl.navigateForward(RouteMap.ContactPage.getPath());
  }

  goToHome() {
    this.navCtrl.navigateForward(RouteMap.HomePage.getPath('main'));
  }
}
