import { Component } from "@angular/core";
import { NavController } from "@ionic/angular";

import { RouteMap } from "~/services/util.service";

@Component({
  selector: "page-about-details",
  templateUrl: "about-details.page.html",
  styleUrls: ["about-details.page.scss"],
})
export class AboutDetailsPage {
  defaultBackHref: string = RouteMap.AboutPage.getPath();

  constructor(private navCtrl: NavController) {}

  goToDonate() {
    this.navCtrl.navigateForward(RouteMap.ContributePage.getPath());
  }
}
