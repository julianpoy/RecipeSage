import { Component } from "@angular/core";
import {
  NavController,
  ToastController,
  ModalController,
  AlertController,
  PopoverController,
} from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import { LoadingService } from "~/services/loading.service";
import { MealPlanService } from "~/services/meal-plan.service";
import { UtilService, RouteMap } from "~/services/util.service";
import { PreferencesService } from "~/services/preferences.service";
import { MealPlanPreferenceKey } from "@recipesage/util";
import { ShareMealPlanModalPage } from "../share-meal-plan-modal/share-meal-plan-modal.page";

@Component({
  selector: "page-meal-plan-popover",
  templateUrl: "meal-plan-popover.page.html",
  styleUrls: ["meal-plan-popover.page.scss"],
})
export class MealPlanPopoverPage {
  preferences = this.preferencesService.preferences;
  preferenceKeys = MealPlanPreferenceKey;

  mealPlanId: any; // From nav params
  mealPlan: any; // From nav params

  constructor(
    public popoverCtrl: PopoverController,
    public modalCtrl: ModalController,
    public translate: TranslateService,
    public navCtrl: NavController,
    public utilService: UtilService,
    public preferencesService: PreferencesService,
    public loadingService: LoadingService,
    public mealPlanService: MealPlanService,
    public toastCtrl: ToastController,
    public alertCtrl: AlertController,
  ) {}

  savePreferences() {
    this.preferencesService.save();

    this.popoverCtrl.dismiss({
      reload: true,
    });
  }

  dismiss() {
    this.popoverCtrl.dismiss();
  }

  async share() {
    const modal = await this.modalCtrl.create({
      component: ShareMealPlanModalPage,
      componentProps: {
        mealPlanId: this.mealPlanId,
      },
    });

    modal.present();
    this.dismiss();
  }

  bulkAddToShoppingList() {
    this.popoverCtrl.dismiss({
      bulkAddToShoppingList: true,
    });
  }

  pinRecipes() {
    this.popoverCtrl.dismiss({
      pinRecipes: true,
    });
  }

  copySelected() {
    this.popoverCtrl.dismiss({
      copy: true,
    });
  }

  moveSelected() {
    this.popoverCtrl.dismiss({
      move: true,
    });
  }

  deleteSelected() {
    this.popoverCtrl.dismiss({
      delete: true,
    });
  }

  async deleteMealPlan() {
    const header = await this.translate
      .get("pages.mealPlanPopover.delete.header")
      .toPromise();
    const message = await this.translate
      .get("pages.mealPlanPopover.delete.message")
      .toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();
    const del = await this.translate.get("generic.delete").toPromise();

    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: cancel,
          role: "cancel",
          handler: () => {},
        },
        {
          text: del,
          cssClass: "alertDanger",
          handler: () => {
            this._deleteMealPlan();
          },
        },
      ],
    });
    alert.present();
  }

  async _deleteMealPlan() {
    const loading = this.loadingService.start();

    const response = await this.mealPlanService.delete(this.mealPlanId);
    loading.dismiss();
    if (!response.success) return;

    this.popoverCtrl.dismiss();
    this.navCtrl.navigateBack(RouteMap.MealPlansPage.getPath());
  }
}
