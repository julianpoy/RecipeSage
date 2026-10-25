import { Component, inject, ChangeDetectionStrategy } from "@angular/core";
import { Router } from "@angular/router";
import { NavController } from "@ionic/angular";

import { RouteMap } from "../../../services/util.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { SocialLinksComponent } from "../../../components/social-links/social-links.component";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonBackButton,
  IonTitle,
  IonContent,
  IonList,
  IonListHeader,
  IonItemGroup,
  IonLabel,
  IonItem,
  IonIcon,
} from "@ionic/angular";
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
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    ...SHARED_UI_IMPORTS,
    SocialLinksComponent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonBackButton,
    IonTitle,
    IonContent,
    IonList,
    IonListHeader,
    IonItemGroup,
    IonLabel,
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

    if (this.router.getCurrentNavigation()?.extras.state?.showBack) {
      this.showBack = true;
    }
  }

  navCtrl = inject(NavController);
  router = inject(Router);

  showBack = false;
  defaultBackHref: string = RouteMap.MorePage.getPath();

  goToAboutDetails() {
    this.navCtrl.navigateForward(RouteMap.AboutDetailsPage.getPath());
  }

  goToContact() {
    this.navCtrl.navigateForward(RouteMap.ContactPage.getPath());
  }

  goToContribute() {
    this.navCtrl.navigateForward(RouteMap.ContributePage.getPath(), {
      state: { showBack: true },
    });
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
