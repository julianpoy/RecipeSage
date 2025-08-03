import { Component, inject } from "@angular/core";
import { AlertController, NavController } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";
import dayjs from "dayjs";

import { LoadingService } from "../../../services/loading.service";
import {
  UtilService,
  RouteMap,
  AuthType,
} from "../../../services/util.service";

import {
  ModalController,
  ToastController,
} from "@ionic/angular";

import { CapabilitiesService } from "../../../services/capabilities.service";
import { MealOptionDefaultService } from "../../../services/meal-option-default.service";
import { TRPCService } from "../../../services/trpc.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { MealOption } from "@prisma/client";
import { NewMealOptionModalPage } from "./new-meal-option-modal/new-meal-option-modal.page";
import { ManageMealOptionModalPage } from "./manage-meal-option-modal/manage-meal-option-modal.page";

@Component({
  selector: "meal-options",
  templateUrl: "meal-options.page.html",
  styleUrls: ["meal-options.page.scss"],
  imports: [...SHARED_UI_IMPORTS],
})

export class MealOptionsPage {
  private navCtrl = inject(NavController);
  private translate = inject(TranslateService);
  private alertCtrl = inject(AlertController);
  private utilService = inject(UtilService);
  private loadingService = inject(LoadingService);
  private trpcService = inject(TRPCService);
  private modalCtrl = inject(ModalController);
  private mealDefault = inject(MealOptionDefaultService);

  defaultBackHref: string = RouteMap.SettingsPage.getPath();

  mealOptions: MealOption[] = [];

  constructor() {
    this.load();
  }

  async load() {

    const loading = this.loadingService.start();
    
    Promise.all([
      this.trpcService.handle(this.trpcService.trpc.mealOptions.getMealOptions.query()),
    ]).then(async ([mealOptions]) => {
      loading.dismiss();

      this.mealOptions = [...this.mealDefault.get(), ...(mealOptions ?? [])].sort((a: MealOption, b: MealOption) => {
        return a.mealTime < b.mealTime ? -1 : 1;
      });
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
      loading.dismiss()
      this.load();
    });

    newModal.present();
  }
}