import { Component } from "@angular/core";
import { NavController } from "@ionic/angular";

import { RouteMap } from "~/services/util.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { SocialLinksComponent } from "../../../components/social-links/social-links.component";

@Component({
  selector: "page-about-details",
  templateUrl: "about-details.page.html",
  styleUrls: ["about-details.page.scss"],
  imports: [...SHARED_UI_IMPORTS, SocialLinksComponent],
})
export class AboutDetailsPage {
  defaultBackHref: string = RouteMap.AboutPage.getPath();

  constructor(private navCtrl: NavController) {}

  goToDonate() {
    this.navCtrl.navigateForward(RouteMap.ContributePage.getPath());
  }
}
