import { Component, Input, inject } from "@angular/core";
import {
  NavController,
  ModalController,
  AlertController,
  ToastController,
} from "@ionic/angular";
import { MealOptionService } from "~/services/meal-option.service";
import { UtilService, RouteMap, AuthType } from "~/services/util.service";
import { LoadingService } from "~/services/loading.service";
import { TranslateService } from "@ngx-translate/core";
import { RecipeService } from "~/services/recipe.service";
import type { MealOptionSummary } from "@recipesage/prisma";
import { SHARED_UI_IMPORTS } from "../../../../providers/shared-ui.provider";

@Component({
  selector: "page-manage-meal-option-modal",
  templateUrl: "manage-meal-option-modal.page.html",
  styleUrls: ["manage-meal-option-modal.page.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class ManageMealOptionModalPage {
  navCtrl = inject(NavController);
  translate = inject(TranslateService);
  loadingService = inject(LoadingService);
  toastCtrl = inject(ToastController);
  modalCtrl = inject(ModalController);
  alertCtrl = inject(AlertController);
  utilService = inject(UtilService);
  mealOptionService = inject(MealOptionService);
  recipeService = inject(RecipeService);

  @Input({
    required: true,
  })
  mealOption!: MealOptionSummary;

  constructor() {}

  async _update(newTitle: string, newMealTime: string) {
    const loading = this.loadingService.start();

    const header = await this.translate
      .get("pages.settings.mealOptions.updateConflict.header")
      .toPromise();

    const message = await this.translate
      .get("pages.settings.mealOptions.updateConflict.message")
      .toPromise();

    const okay = await this.translate.get("generic.okay").toPromise();

    const mealOption = await this.mealOptionService
      .update(
        this.mealOption.id,
        {
          title: newTitle,
          mealTime: newMealTime,
        },
        {
          409: async () => {
            (
              await this.alertCtrl.create({
                header,
                message,
                buttons: [
                  {
                    text: okay,
                    handler: () => {},
                  },
                ],
              })
            ).present();
          },
        },
      )
      .then((mealOption) => {
        if (!mealOption) return;

        this.mealOption.title = newTitle;
        this.mealOption.mealTime = newMealTime;
      })
      .finally(() => {
        loading.dismiss();
      });
  }

  async update() {
    const header = await this.translate
      .get("pages.settings.mealOptions.update.header", {
        name: this.mealOption.title,
      })
      .toPromise();
    const textPlaceholder = await this.translate
      .get("pages.settings.mealOptions.new.titleInputPlaceholder")
      .toPromise();
    const timePlaceholder = await this.translate
      .get("pages.settings.mealOptions.new.timeInputPlaceholder")
      .toPromise();

    const cancel = await this.translate.get("generic.cancel").toPromise();
    const okay = await this.translate.get("generic.okay").toPromise();

    const updatePrompt = await this.alertCtrl.create({
      header,
      inputs: [
        {
          name: "title",
          type: "text",
          id: "title",
          value: this.mealOption.title,
          placeholder: textPlaceholder,
        },
        {
          name: "mealTime",
          type: "time",
          id: "mealTime",
          value: this.mealOption.mealTime,
          placeholder: timePlaceholder,
        },
      ],
      buttons: [
        {
          text: cancel,
          role: "cancel",
          cssClass: "secondary",
        },
        {
          text: okay,
          handler: (response) => {
            this._update(response.title, response.mealTime);
          },
        },
      ],
    });

    await updatePrompt.present();
  }

  async _delete() {
    const loading = this.loadingService.start();

    await this.mealOptionService.delete(this.mealOption.id);

    loading.dismiss();

    this.modalCtrl.dismiss();
  }

  async delete() {
    const header = await this.translate
      .get("pages.settings.mealOptions.delete.header", {
        name: this.mealOption.title,
      })
      .toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();
    const del = await this.translate.get("generic.delete").toPromise();

    const deletePrompt = await this.alertCtrl.create({
      header,
      buttons: [
        {
          text: cancel,
          role: "cancel",
          cssClass: "secondary",
        },
        {
          text: del,
          cssClass: "alertDanger",
          handler: (response) => {
            this._delete();
          },
        },
      ],
    });

    await deletePrompt.present();
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
