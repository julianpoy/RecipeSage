import { Component, inject } from "@angular/core";
import { NavController, ModalController } from "@ionic/angular/standalone";

import { LoadingService } from "~/services/loading.service";
import { RouteMap } from "~/services/util.service";
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
  selector: "page-new-meal-plan-modal",
  templateUrl: "new-meal-plan-modal.page.html",
  styleUrls: ["new-meal-plan-modal.page.scss"],
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
export class NewMealPlanModalPage {
  constructor() {
    addIcons({ close, list, reorderThree });
  }

  private navCtrl = inject(NavController);
  private modalCtrl = inject(ModalController);
  private loadingService = inject(LoadingService);
  private serverActionsService = inject(ServerActionsService);

  mealPlanTitle = "";
  customMealOptions: string | null = null;
  selectedCollaboratorIds: any = [];

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

    const result = await this.serverActionsService.mealPlans.createMealPlan({
      title: this.mealPlanTitle,
      collaboratorUserIds: this.selectedCollaboratorIds,
      customMealOptions: this.customMealOptions,
    });
    loading.dismiss();
    if (!result) return;

    this.modalCtrl.dismiss({
      success: true,
      id: result.id,
    });
    this.navCtrl.navigateForward(RouteMap.MealPlanPage.getPath(result.id));
  }

  cancel() {
    this.modalCtrl.dismiss({
      success: false,
    });
  }
}
