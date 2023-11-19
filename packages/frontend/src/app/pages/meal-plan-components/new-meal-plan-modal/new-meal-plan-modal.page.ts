import { Component } from "@angular/core";
import {
  NavController,
  ModalController,
  ToastController,
} from "@ionic/angular";

import { LoadingService } from "~/services/loading.service";
import { MessagingService } from "~/services/messaging.service";
import { MealPlanService } from "~/services/meal-plan.service";
import { UtilService, RouteMap, AuthType } from "~/services/util.service";

@Component({
  selector: "page-new-meal-plan-modal",
  templateUrl: "new-meal-plan-modal.page.html",
  styleUrls: ["new-meal-plan-modal.page.scss"],
})
export class NewMealPlanModalPage {
  mealPlanTitle = "";

  selectedCollaboratorIds: any = [];

  constructor(
    public navCtrl: NavController,
    public modalCtrl: ModalController,
    public loadingService: LoadingService,
    public mealPlanService: MealPlanService,
    public messagingService: MessagingService,
    public utilService: UtilService,
    public toastCtrl: ToastController,
  ) {}

  async save() {
    const loading = this.loadingService.start();

    const response = await this.mealPlanService.create({
      title: this.mealPlanTitle,
      collaborators: this.selectedCollaboratorIds,
    });
    loading.dismiss();
    if (!response.success) return;

    this.modalCtrl.dismiss({
      success: true,
    });
    this.navCtrl.navigateForward(
      RouteMap.MealPlanPage.getPath(response.data.id),
    );
  }

  cancel() {
    this.modalCtrl.dismiss({
      success: false,
    });
  }
}
