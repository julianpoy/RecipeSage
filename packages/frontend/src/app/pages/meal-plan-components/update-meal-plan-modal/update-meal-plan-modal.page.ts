import { Component, Input, inject } from "@angular/core";
import { ModalController } from "@ionic/angular/standalone";
import type { MealPlanSummary } from "@recipesage/prisma";

import { LoadingService } from "../../../services/loading.service";
import { ServerActionsService } from "../../../services/server-actions.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { SelectCollaboratorsComponent } from "../../../components/select-collaborators/select-collaborators.component";
import { MealPlanMealOrderModalPage } from "../meal-plan-meal-order-modal/meal-plan-meal-order-modal.page";
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonItem,
  IonInput,
  IonLabel,
  IonFooter,
} from "@ionic/angular/standalone";
import { close, list, reorderThree } from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "page-update-meal-plan-modal",
  templateUrl: "update-meal-plan-modal.page.html",
  styleUrls: ["update-meal-plan-modal.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    SelectCollaboratorsComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonItem,
    IonInput,
    IonLabel,
    IonFooter,
  ],
})
export class UpdateMealPlanModalPage {
  constructor() {
    addIcons({ close, list, reorderThree });
  }

  private modalCtrl = inject(ModalController);
  private loadingService = inject(LoadingService);
  private serverActionsService = inject(ServerActionsService);

  @Input({
    required: true,
  })
  mealPlan!: Readonly<MealPlanSummary>;

  mealPlanTitle = "";
  customMealOptions: string | null = null;
  selectedCollaboratorIds: string[] = [];
  loaded = false;

  ionViewWillEnter() {
    this.mealPlanTitle = this.mealPlan.title;
    this.customMealOptions = this.mealPlan.customMealOptions;
    this.selectedCollaboratorIds = this.mealPlan.collaboratorUsers.map(
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

    const result = await this.serverActionsService.mealPlans.updateMealPlan({
      id: this.mealPlan.id,
      title: this.mealPlanTitle,
      collaboratorUserIds: this.selectedCollaboratorIds,
      customMealOptions: this.customMealOptions,
    });
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
