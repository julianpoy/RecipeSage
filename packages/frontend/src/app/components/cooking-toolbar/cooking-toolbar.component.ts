import { Component, inject } from "@angular/core";
import { AlertController, NavController } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import { RouteMap } from "~/services/util.service";
import { CookingToolbarService } from "~/services/cooking-toolbar.service";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";

@Component({
  standalone: true,
  selector: "cooking-toolbar",
  templateUrl: "cooking-toolbar.component.html",
  styleUrls: ["./cooking-toolbar.component.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class CookingToolbarComponent {
  private navCtrl = inject(NavController);
  private alertCtrl = inject(AlertController);
  private translate = inject(TranslateService);
  cookingToolbarService = inject(CookingToolbarService);

  openRecipe(recipeId: string) {
    this.navCtrl.navigateForward(RouteMap.RecipePage.getPath(recipeId));
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
