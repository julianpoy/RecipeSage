import { Component } from '@angular/core';
import { NavController, ModalController, ToastController } from '@ionic/angular';

import { MealPlanService } from '@/services/meal-plan.service';
import { WebsocketService } from '@/services/websocket.service';
import { LoadingService } from '@/services/loading.service';
import { UtilService, RouteMap, AuthType } from '@/services/util.service';
import { NewMealPlanModalPage } from '@/pages/meal-plan-components/new-meal-plan-modal/new-meal-plan-modal.page';

@Component({
  selector: 'page-meal-plans',
  templateUrl: 'meal-plans.page.html',
  styleUrls: ['meal-plans.page.scss']
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
    public utilService: UtilService) {

    this.websocketService.register('mealPlan:received', () => {
      this.loadPlans();
    }, this);

    this.websocketService.register('mealPlan:removed', () => {
      this.loadPlans();
    }, this);
  }

  ionViewDidLoad() { }

  ionViewWillEnter() {
    const loading = this.loadingService.start();

    this.initialLoadComplete = false;

    this.loadPlans().then(() => {
      loading.dismiss();
      this.initialLoadComplete = true;
    }, () => {
      loading.dismiss();
      this.initialLoadComplete = true;
    });
  }

  refresh(refresher) {
    this.loadPlans().then(() => {
      refresher.target.complete();
    }, () => {
      refresher.target.complete();
    });
  }

  loadPlans() {
    return new Promise((resolve, reject) => {
      this.mealPlanService.fetch().then(response => {
        this.mealPlans = response.sort((a, b) => {
          return a.title.localeCompare(b.title);
        });

        resolve();
      }).catch(async err => {
        reject();

        switch (err.response.status) {
          case 0:
            const offlineToast = await this.toastCtrl.create({
              message: this.utilService.standardMessages.offlineFetchMessage,
              duration: 5000
            });
            offlineToast.present();
            break;
          case 401:
            this.navCtrl.navigateRoot(RouteMap.AuthPage.getPath(AuthType.Login));
            break;
          default:
            const errorToast = await this.toastCtrl.create({
              message: this.utilService.standardMessages.unexpectedError,
              duration: 30000
            });
            errorToast.present();
            break;
        }
      });
    });
  }

  async newMealPlan() {
    const modal = await this.modalCtrl.create({
      component: NewMealPlanModalPage
    });
    modal.present();
    modal.onDidDismiss().then(() => {
      this.loadPlans();
    });
  }

  openMealPlan(mealPlanId) {
    this.navCtrl.navigateForward(RouteMap.MealPlanPage.getPath(mealPlanId));
  }

  formatItemCreationDate(plainTextDate) {
    return this.utilService.formatDate(plainTextDate, { now: true });
  }
}
