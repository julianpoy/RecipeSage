import { Component, inject } from "@angular/core";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonContent,
  IonIcon,
  IonRippleEffect,
  IonSpinner,
  NavController,
} from "@ionic/angular/standalone";
import { addIcons } from "ionicons";
import {
  restaurantOutline,
  downloadOutline,
  createOutline,
} from "ionicons/icons";

import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { RouteMap } from "../../services/util.service";
import { ServerActionsService } from "../../services/server-actions.service";
import { LoadingService } from "../../services/loading.service";

@Component({
  standalone: true,
  selector: "page-welcome-flow",
  templateUrl: "welcome-flow.page.html",
  styleUrls: ["welcome-flow.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonContent,
    IonIcon,
    IonRippleEffect,
    IonSpinner,
  ],
})
export class WelcomeFlowPage {
  private navCtrl = inject(NavController);
  private serverActionsService = inject(ServerActionsService);
  private loadingService = inject(LoadingService);

  creating = false;

  constructor() {
    addIcons({ restaurantOutline, downloadOutline, createOutline });
  }

  startBlank() {
    if (this.creating) return;
    this.navCtrl.navigateRoot(RouteMap.HomePage.getPath("main"));
  }

  async addExampleRecipes() {
    if (this.creating) return;
    this.creating = true;
    const loading = this.loadingService.start();

    const response =
      await this.serverActionsService.recipes.createExampleRecipes();

    loading.dismiss();
    this.creating = false;

    if (!response) return;

    this.navCtrl.navigateRoot(RouteMap.HomePage.getPath("main"));
  }

  goToImport() {
    if (this.creating) return;
    this.navCtrl.navigateRoot(RouteMap.ImportPage.getPath());
  }
}
