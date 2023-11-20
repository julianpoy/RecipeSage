import { Component } from "@angular/core";
import {
  NavController,
  ModalController,
  ToastController,
} from "@ionic/angular";

import { MealPlanService } from "~/services/meal-plan.service";
import { WebsocketService } from "~/services/websocket.service";
import { LoadingService } from "~/services/loading.service";
import { UtilService, RouteMap } from "~/services/util.service";
import { NewMealPlanModalPage } from "~/pages/meal-plan-components/new-meal-plan-modal/new-meal-plan-modal.page";

@Component({
  selector: "page-meal-plans",
  templateUrl: "meal-plans.page.html",
  styleUrls: ["meal-plans.page.scss"],
})
export class MealPlansPage {
  mealPlans: any = [];

  initialLoadComplete = false;

  constructor(
    public navCtrl: NavController,
    public modalCtrl: ModalController,
    public toastCtrl: ToastController,
    public mealPlanService: MealPlanService,
    public websocketService: WebsocketService,
    public loadingService: LoadingService,
    public utilService: UtilService,
  ) {
    this.websocketService.register(
      "mealPlan:received",
      () => {
        this.loadPlans();
      },
      this,
    );

    this.websocketService.register(
      "mealPlan:removed",
      () => {
        this.loadPlans();
      },
      this,
    );
  }

  ionViewDidLoad() {}

  ionViewWillEnter() {
    const loading = this.loadingService.start();

    this.initialLoadComplete = false;

    this.loadPlans().finally(() => {
      loading.dismiss();
      this.initialLoadComplete = true;
    });
  }

  refresh(refresher: any) {
    this.loadPlans().then(
      () => {
        refresher.target.complete();
      },
      () => {
        refresher.target.complete();
      },
    );
  }

  async loadPlans() {
    const response = await this.mealPlanService.fetch();
    if (!response.success) return;

    this.mealPlans = response.data.sort((a, b) => {
      return a.title.localeCompare(b.title);
    });
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

  formatItemCreationDate(plainTextDate: string) {
    return this.utilService.formatDate(plainTextDate, { now: true });
  }
}
