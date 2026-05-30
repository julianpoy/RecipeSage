import { Component, inject } from "@angular/core";
import { NavController } from "@ionic/angular/standalone";

import { RouteMap } from "../../services/util.service";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
} from "@ionic/angular/standalone";
import { addIcons } from "ionicons";
import { book, chatboxEllipses } from "ionicons/icons";

@Component({
  standalone: true,
  selector: "page-tools",
  templateUrl: "tools.page.html",
  styleUrls: ["tools.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
  ],
})
export class ToolsPage {
  private navCtrl = inject(NavController);

  constructor() {
    addIcons({ book, chatboxEllipses });
  }

  goToCookbookGenerator() {
    this.navCtrl.navigateForward(RouteMap.CookbookGeneratorPage.getPath());
  }

  goToAssistant() {
    this.navCtrl.navigateForward(RouteMap.AssistantPage.getPath());
  }
}
