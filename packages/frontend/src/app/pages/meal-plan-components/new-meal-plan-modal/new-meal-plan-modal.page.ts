import { Component, inject } from "@angular/core";
import { NavController, ModalController } from "@ionic/angular";

import { LoadingService } from "~/services/loading.service";
import { RouteMap } from "~/services/util.service";
import { TRPCService } from "../../../services/trpc.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { SelectCollaboratorsComponent } from "../../../components/select-collaborators/select-collaborators.component";

@Component({
  selector: "page-new-meal-plan-modal",
  templateUrl: "new-meal-plan-modal.page.html",
  styleUrls: ["new-meal-plan-modal.page.scss"],
  imports: [...SHARED_UI_IMPORTS, SelectCollaboratorsComponent],
})
export class NewMealPlanModalPage {
  private navCtrl = inject(NavController);
  private modalCtrl = inject(ModalController);
  private loadingService = inject(LoadingService);
  private trpcService = inject(TRPCService);

  mealPlanTitle = "";

  selectedCollaboratorIds: any = [];

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
