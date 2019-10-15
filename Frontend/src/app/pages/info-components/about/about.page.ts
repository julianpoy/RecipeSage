import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';

import { RouteMap } from '@/services/util.service';

@Component({
  selector: 'page-about',
  templateUrl: 'about.page.html',
  styleUrls: ['about.page.scss']
})
export class AboutPage {

  constructor(public navCtrl: NavController) {}

  goToAboutDetails() {
    this.navCtrl.navigateForward(RouteMap.AboutDetailsPage.getPath());
  }

  goToContact() {
    this.navCtrl.navigateForward(RouteMap.ContactPage.getPath());
  }

  goToContribute() {
    this.navCtrl.navigateForward(RouteMap.ContributePage.getPath());
  }

  goToReleaseNotes() {
    this.navCtrl.navigateForward(RouteMap.ReleaseNotesPage.getPath());
  }

  goToTipsTricksTutorials() {
    this.navCtrl.navigateForward(RouteMap.TipsTricksTutorialsPage.getPath());
  }

  goToLegal() {
    this.navCtrl.navigateForward(RouteMap.LegalPage.getPath());
  }
}
