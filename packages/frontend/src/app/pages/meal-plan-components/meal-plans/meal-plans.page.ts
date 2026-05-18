import { Component, computed, inject } from "@angular/core";
import { NavController, ModalController } from "@ionic/angular/standalone";

import { WebsocketService } from "../../../services/websocket.service";
import { LoadingService } from "../../../services/loading.service";
import { UtilService, RouteMap } from "../../../services/util.service";
import { NewMealPlanModalPage } from "../new-meal-plan-modal/new-meal-plan-modal.page";
import { ServerActionsService } from "../../../services/server-actions.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { NullStateComponent } from "../../../components/null-state/null-state.component";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonIcon,
  IonLabel,
  IonBadge,
  IonFab,
  IonFabButton,
  IonSpinner,
} from "@ionic/angular/standalone";
import { add, calendar } from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "page-meal-plans",
  templateUrl: "meal-plans.page.html",
  styleUrls: ["meal-plans.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    NullStateComponent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonIcon,
    IonLabel,
    IonBadge,
    IonFab,
    IonFabButton,
    IonSpinner,
  ],
})
export class MealPlansPage {
  constructor() {
    addIcons({ add, calendar });
  }

  private navCtrl = inject(NavController);
  private modalCtrl = inject(ModalController);
  private serverActionsService = inject(ServerActionsService);
  private websocketService = inject(WebsocketService);
  private loadingService = inject(LoadingService);
  private utilService = inject(UtilService);

  private meQuery = this.serverActionsService.users.getMe();
  me = this.meQuery.value;
  private mealPlansQuery = this.serverActionsService.mealPlans.getMealPlans();
  mealPlans = computed(() => {
    const plans = this.mealPlansQuery.value();
    if (!plans) return plans;
    return [...plans].sort((a, b) => a.title.localeCompare(b.title));
  });

  ionViewWillEnter() {
    this.loadPlans();

    this.websocketService.on("mealplan:updated", this.onWSEvent);
  }

  ionViewWillLeave() {
    this.websocketService.off("mealplan:updated", this.onWSEvent);
  }

  onWSEvent = () => {
    this.loadPlans();
  };

  loadPlans() {
    this.mealPlansQuery.refresh();
  }

  async newMealPlan() {
    const modal = await this.modalCtrl.create({
      component: NewMealPlanModalPage,
    });
    modal.present();
    modal.onDidDismiss().then(() => {
      this.loadPlans();
    });
  }

  openMealPlan(mealPlanId: string) {
    this.navCtrl.navigateForward(RouteMap.MealPlanPage.getPath(mealPlanId));
  }

  formatItemCreationDate(date: string | Date) {
    return this.utilService.formatDate(date, { now: true });
  }
}
