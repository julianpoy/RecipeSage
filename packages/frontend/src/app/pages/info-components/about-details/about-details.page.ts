import { Component, inject } from "@angular/core";
import { NavController } from "@ionic/angular/standalone";

import { RouteMap } from "../../../services/util.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { SocialLinksComponent } from "../../../components/social-links/social-links.component";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
} from "@ionic/angular/standalone";

@Component({
  standalone: true,
  selector: "page-about-details",
  templateUrl: "about-details.page.html",
  styleUrls: ["about-details.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    SocialLinksComponent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
  ],
})
export class AboutDetailsPage {
  private navCtrl = inject(NavController);

  defaultBackHref: string = RouteMap.AboutPage.getPath();

  goToDonate() {
    this.navCtrl.navigateForward(RouteMap.ContributePage.getPath());
  }
}
