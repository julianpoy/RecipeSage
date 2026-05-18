import { Component, inject } from "@angular/core";
import { NavController } from "@ionic/angular/standalone";

import { RouteMap } from "../../../services/util.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { NullStateComponent } from "../../../components/null-state/null-state.component";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonContent,
  IonIcon,
  IonLabel,
} from "@ionic/angular/standalone";
import { compass } from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "page-not-found",
  templateUrl: "not-found.page.html",
  styleUrls: ["not-found.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    NullStateComponent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonContent,
    IonIcon,
    IonLabel,
  ],
})
export class NotFoundPage {
  constructor() {
    addIcons({ compass });
  }

  private navCtrl = inject(NavController);

  goToContact() {
    this.navCtrl.navigateForward(RouteMap.ContactPage.getPath());
  }

  goToHome() {
    this.navCtrl.navigateForward(RouteMap.HomePage.getPath("main"));
  }
}
