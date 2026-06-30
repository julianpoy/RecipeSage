import { Component, inject } from "@angular/core";
import { NavController } from "@ionic/angular/standalone";

import { RouteMap } from "../../../services/util.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { SocialLinksComponent } from "../../../components/social-links/social-links.component";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonIcon,
} from "@ionic/angular/standalone";
import {
  archiveOutline,
  heartOutline,
  helpOutline,
  listOutline,
  personOutline,
  sendOutline,
} from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "page-about",
  templateUrl: "about.page.html",
  styleUrls: ["about.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    SocialLinksComponent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonIcon,
  ],
})
export class AboutPage {
  constructor() {
    addIcons({
      archiveOutline,
      heartOutline,
      helpOutline,
      listOutline,
      personOutline,
      sendOutline,
    });
  }

  navCtrl = inject(NavController);

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
    window.open("https://docs.recipesage.com/docs/release-notes");
  }

  goToUserGuide() {
    window.open("https://docs.recipesage.com");
  }

  goToLegal() {
    this.navCtrl.navigateForward(RouteMap.LegalPage.getPath());
  }
}
