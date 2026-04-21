import { Component, Input, inject } from "@angular/core";
import { ModalController } from "@ionic/angular/standalone";

import { LoadingService } from "~/services/loading.service";
import { TRPCService } from "../../../services/trpc.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { SelectCollaboratorsComponent } from "../../../components/select-collaborators/select-collaborators.component";
import { MealPlanMealOrderModalPage } from "../meal-plan-meal-order-modal/meal-plan-meal-order-modal.page";

@Component({
  standalone: true,
  selector: "page-update-meal-plan-modal",
  templateUrl: "update-meal-plan-modal.page.html",
  styleUrls: ["update-meal-plan-modal.page.scss"],
  imports: [...SHARED_UI_IMPORTS, SelectCollaboratorsComponent],
})
export class UpdateMealPlanModalPage {
  private modalCtrl = inject(ModalController);
  private loadingService = inject(LoadingService);
  private trpcService = inject(TRPCService);

  @Input({
    required: true,
  })
  mealPlanId!: string;

  mealPlanTitle = "";
  customMealOptions: string | null = null;
  selectedCollaboratorIds: string[] = [];
  loaded = false;

  ionViewWillEnter() {
    this.load();
  }

  async load() {
    const loading = this.loadingService.start();

    const result = await this.trpcService.handle(
      this.trpcService.trpc.mealPlans.getMealPlan.query({
        id: this.mealPlanId,
      }),
    );
    loading.dismiss();
    if (!result) return;

    this.mealPlanTitle = result.title;
    this.customMealOptions = result.customMealOptions;
    this.selectedCollaboratorIds = result.collaboratorUsers.map(
      (collaboratorUser) => collaboratorUser.user.id,
    );

    this.loaded = true;
  }

  async openCustomMealOptions() {
    const modal = await this.modalCtrl.create({
      component: MealPlanMealOrderModalPage,
      componentProps: {
        customMealOptions: this.customMealOptions || undefined,
      },
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();

    if (data?.customMealOptions !== undefined) {
      this.customMealOptions = data.customMealOptions || null;
    }
  }

  async save() {
    const loading = this.loadingService.start();

    const result = await this.trpcService.handle(
      this.trpcService.trpc.mealPlans.updateMealPlan.mutate({
        id: this.mealPlanId,
        title: this.mealPlanTitle,
        collaboratorUserIds: this.selectedCollaboratorIds,
        customMealOptions: this.customMealOptions,
      }),
    );
    loading.dismiss();
    if (!result) return;

    this.modalCtrl.dismiss({
      success: true,
    });
  }

  cancel() {
    this.modalCtrl.dismiss({
      success: false,
    });
  }
}
