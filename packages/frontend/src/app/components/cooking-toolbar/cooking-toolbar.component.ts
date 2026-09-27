import { Component, inject } from "@angular/core";
import { AlertController, NavController } from "@ionic/angular/standalone";
import { Router } from "@angular/router";
import { TranslateService } from "@ngx-translate/core";

import { RouteMap, UtilService } from "../../services/util.service";
import {
  CookingToolbarService,
  PinnedRecipe,
} from "../../services/cooking-toolbar.service";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { IonIcon, IonRippleEffect } from "@ionic/angular/standalone";
import { closeOutline, pinOutline } from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "cooking-toolbar",
  templateUrl: "cooking-toolbar.component.html",
  styleUrls: ["./cooking-toolbar.component.scss"],
  imports: [...SHARED_UI_IMPORTS, IonIcon, IonRippleEffect],
})
export class CookingToolbarComponent {
  constructor() {
    addIcons({ closeOutline, pinOutline });
  }

  private navCtrl = inject(NavController);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private translate = inject(TranslateService);
  private utilService = inject(UtilService);
  cookingToolbarService = inject(CookingToolbarService);

  openRecipe(pinnedRecipe: PinnedRecipe, event: MouseEvent) {
    if (pinnedRecipe.path) {
      this.utilService.navigateForwardOrOpenWindow(
        this.navCtrl,
        pinnedRecipe.path,
        event,
      );
      return;
    }
    const inCookMode = this.router.url.split("?")[0].endsWith("/cook");
    const path = inCookMode
      ? RouteMap.RecipePageCook.getPath(pinnedRecipe.id)
      : RouteMap.RecipePage.getPath(pinnedRecipe.id);
    this.utilService.navigateForwardOrOpenWindow(this.navCtrl, path, event);
  }

  async clearPins() {
    const header = await this.translate
      .get("components.cookingToolbar.clear")
      .toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();
    const confirm = await this.translate.get("generic.confirm").toPromise();

    const alert = await this.alertCtrl.create({
      header,
      buttons: [
        {
          text: cancel,
          role: "cancel",
        },
        {
          text: confirm,
          handler: () => {
            this.cookingToolbarService.clearPins();
          },
        },
      ],
    });
    alert.present();
  }
}
