import { Component } from "@angular/core";
import { NavController, ModalController } from "@ionic/angular";

import { LoadingService } from "~/services/loading.service";
import { RouteMap } from "~/services/util.service";
import { TRPCService } from "../../../services/trpc.service";

@Component({
  selector: "page-new-meal-plan-modal",
  templateUrl: "new-meal-plan-modal.page.html",
  styleUrls: ["new-meal-plan-modal.page.scss"],
})
export class NewMealPlanModalPage {
  mealPlanTitle = "";

  selectedCollaboratorIds: any = [];

  constructor(
    private navCtrl: NavController,
    private modalCtrl: ModalController,
    private loadingService: LoadingService,
    private trpcService: TRPCService,
  ) {}

  async save() {
    const loading = this.loadingService.start();

    const result = await this.trpcService.handle(
      this.trpcService.trpc.mealPlans.createMealPlan.mutate({
        title: this.mealPlanTitle,
        collaboratorUserIds: this.selectedCollaboratorIds,
      }),
    );
    loading.dismiss();
    if (!result) return;

    this.modalCtrl.dismiss({
      success: true,
    });
    this.navCtrl.navigateForward(RouteMap.MealPlanPage.getPath(result.id));
  }

  cancel() {
    this.modalCtrl.dismiss({
      success: false,
    });
  }
}
