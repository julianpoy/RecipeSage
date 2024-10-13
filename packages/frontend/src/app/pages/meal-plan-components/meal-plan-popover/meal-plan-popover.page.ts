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
import { MealPlanPreferenceKey } from "@recipesage/util/shared";
import { ShareMealPlanModalPage } from "../share-meal-plan-modal/share-meal-plan-modal.page";
import { TRPCService } from "../../../services/trpc.service";
import { UpdateMealPlanModalPage } from "../update-meal-plan-modal/update-meal-plan-modal.page";
import { UserService } from "../../../services/user.service";

@Component({
  selector: "page-meal-plan-popover",
  templateUrl: "meal-plan-popover.page.html",
  styleUrls: ["meal-plan-popover.page.scss"],
})
export class MealPlanPopoverPage {
  preferences = this.preferencesService.preferences;
  preferenceKeys = MealPlanPreferenceKey;
  isOwner: boolean = false;
  loading: boolean = true;

  mealPlanId: any; // From nav params
  mealPlan: any; // From nav params

  constructor(
    private popoverCtrl: PopoverController,
    private modalCtrl: ModalController,
    private translate: TranslateService,
    private navCtrl: NavController,
    private preferencesService: PreferencesService,
    private userService: UserService,
    private loadingService: LoadingService,
    private trpcService: TRPCService,
    private alertCtrl: AlertController,
  ) {}

  ngAfterViewInit() {
    this.loading = true;
    this.loadUser().finally(() => {
      this.loading = false;
    });
  }

  async loadUser() {
    const response = await this.userService.getMyProfile({
      401: () => {},
    });
    if (!response.success) return;

    this.isOwner = response.data.id === this.mealPlan.userId;
  }

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

    const result = await this.trpcService.handle(
      this.trpcService.trpc.mealPlans.deleteMealPlan.mutate({
        id: this.mealPlanId,
      }),
    );
    loading.dismiss();
    if (!result) return;

    this.popoverCtrl.dismiss();
    this.navCtrl.navigateBack(RouteMap.MealPlansPage.getPath());
  }

  async updateMealPlan(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: UpdateMealPlanModalPage,
      componentProps: {
        mealPlanId: this.mealPlanId,
      },
    });

    await modal.present();
    await modal.onDidDismiss();

    this.popoverCtrl.dismiss({
      reload: true,
    });
  }
}
