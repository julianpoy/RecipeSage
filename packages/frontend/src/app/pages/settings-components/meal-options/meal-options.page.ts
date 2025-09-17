import { Component, inject } from "@angular/core";

import { LoadingService } from "../../../services/loading.service";
import { RouteMap } from "../../../services/util.service";

import { ModalController } from "@ionic/angular";

import { MealOptionsPreferenceKey } from "@recipesage/util/shared";

import { MealOptionService } from "../../../services/meal-option.service";
import { MealOptionDefaultService } from "../../../services/meal-option-default.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { MealOption } from "@prisma/client";
import { NewMealOptionModalPage } from "./new-meal-option-modal/new-meal-option-modal.page";
import { ManageMealOptionModalPage } from "./manage-meal-option-modal/manage-meal-option-modal.page";
import { PreferencesService } from "../../../services/preferences.service";
@Component({
  selector: "meal-options",
  templateUrl: "meal-options.page.html",
  styleUrls: ["meal-options.page.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class MealOptionsPage {
  private loadingService = inject(LoadingService);
  private modalCtrl = inject(ModalController);
  private mealDefault = inject(MealOptionDefaultService);
  private preferencesService = inject(PreferencesService);
  private mealOptionService = inject(MealOptionService);

  preferences = this.preferencesService.preferences;
  preferenceKeys = MealOptionsPreferenceKey;
  defaultBackHref: string = RouteMap.SettingsPage.getPath();
  mealOptions: MealOption[] = [];

  constructor() {
    this.load();
  }

  async load() {
    const loading = this.loadingService.start();

    this.mealOptionService.fetch().then((mealOptions) => {
      loading.dismiss();
      this.mealOptions = this.mealDefault.add(mealOptions ?? []);
    });
  }

  async manageMealOption(mealOption: MealOption) {
    const loading = this.loadingService.start();

    const manageModal = await this.modalCtrl.create({
      component: ManageMealOptionModalPage,
      componentProps: {
        mealOption,
      },
    });

    manageModal.onDidDismiss().then(() => {
      loading.dismiss();
      this.load();
    });

    manageModal.present();
  }

  async new() {
    const loading = this.loadingService.start();

    const newModal = await this.modalCtrl.create({
      component: NewMealOptionModalPage,
    });

    newModal.onDidDismiss().then(() => {
      loading.dismiss();
      this.load();
    });

    newModal.present();
  }

  savePreferences() {
    this.preferencesService.save();
  }

  isMealOptionVisible(mealOption: MealOption): boolean {
    return (
      mealOption.userId !== "0" ||
      this.preferences[MealOptionsPreferenceKey.ShowDefaults]
    );
  }
}
