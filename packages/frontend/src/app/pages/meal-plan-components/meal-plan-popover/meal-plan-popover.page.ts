import { Component, inject, Input } from "@angular/core";
import {
  NavController,
  ModalController,
  AlertController,
  PopoverController,
} from "@ionic/angular/standalone";
import { TranslateService } from "@ngx-translate/core";

import { LoadingService } from "~/services/loading.service";
import { RouteMap, UtilService } from "~/services/util.service";
import { PreferencesService } from "~/services/preferences.service";
import {
  GlobalPreferenceKey,
  MealPlanPreferenceKey,
  MealPlanViewTypeOptions,
} from "@recipesage/util/shared";
import { ICalMealPlanModalPage } from "../ical-meal-plan-modal/ical-meal-plan-modal.page";
import { TRPCService } from "../../../services/trpc.service";
import { UpdateMealPlanModalPage } from "../update-meal-plan-modal/update-meal-plan-modal.page";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import type { MealPlanSummary } from "@recipesage/prisma";

@Component({
  standalone: true,
  selector: "page-meal-plan-popover",
  templateUrl: "meal-plan-popover.page.html",
  styleUrls: ["meal-plan-popover.page.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class MealPlanPopoverPage {
  private popoverCtrl = inject(PopoverController);
  private modalCtrl = inject(ModalController);
  private translate = inject(TranslateService);
  private navCtrl = inject(NavController);
  private preferencesService = inject(PreferencesService);
  private loadingService = inject(LoadingService);
  private trpcService = inject(TRPCService);
  private alertCtrl = inject(AlertController);
  private utilService = inject(UtilService);

  preferences = this.preferencesService.preferences;
  preferenceKeys = MealPlanPreferenceKey;
  viewTypeOptions = MealPlanViewTypeOptions;

  @Input({
    required: true,
  })
  mealPlanId!: string;
  @Input({
    required: true,
  })
  mealPlan!: MealPlanSummary;
  @Input({
    required: true,
  })
  isOwner!: boolean;
  @Input() calendarCenter?: Date;
  @Input() viewType?: string;

  savePreferences() {
    this.preferencesService.save();

    this.popoverCtrl.dismiss({
      reload: true,
    });
  }

  dismiss() {
    this.popoverCtrl.dismiss();
  }

  async ical() {
    const modal = await this.modalCtrl.create({
      component: ICalMealPlanModalPage,
      componentProps: {
        mealPlanId: this.mealPlanId,
      },
    });

    modal.present();
    this.dismiss();
  }

  print() {
    const viewType =
      this.viewType || this.preferences[MealPlanPreferenceKey.ViewType];

    window.open(
      this.utilService.generatePrintMealPlanURL(this.mealPlanId, {
        viewType,
        calendarMonth: this.calendarCenter
          ? this.calendarCenter.getMonth() + 1
          : undefined,
        calendarYear: this.calendarCenter
          ? this.calendarCenter.getFullYear()
          : undefined,
        startOfWeek:
          this.preferences[MealPlanPreferenceKey.StartOfWeek] || undefined,
        preferredLanguage:
          this.preferences[GlobalPreferenceKey.Language] || undefined,
      }),
    );

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
    const headerOwner = await this.translate
      .get("pages.mealPlanPopover.deletePlan.header")
      .toPromise();
    const headerCollaborator = await this.translate
      .get("pages.mealPlanPopover.removeSelfFromPlan.header")
      .toPromise();
    const messageOwner = await this.translate
      .get("pages.mealPlanPopover.deletePlan.message")
      .toPromise();
    const messageCollaborator = await this.translate
      .get("pages.mealPlanPopover.removeSelfFromPlan.message")
      .toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();
    const delOwner = await this.translate.get("generic.delete").toPromise();
    const delCollaborator = await this.translate
      .get("generic.confirm")
      .toPromise();

    const alert = await this.alertCtrl.create({
      header: this.isOwner ? headerOwner : headerCollaborator,
      message: this.isOwner ? messageOwner : messageCollaborator,
      buttons: [
        {
          text: cancel,
          role: "cancel",
          handler: () => {},
        },
        {
          text: this.isOwner ? delOwner : delCollaborator,
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
