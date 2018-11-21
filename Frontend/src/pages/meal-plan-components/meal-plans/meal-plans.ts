import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ModalController, ToastController } from 'ionic-angular';
import { MealPlanServiceProvider } from '../../../providers/meal-plan-service/meal-plan-service';
import { WebsocketServiceProvider } from '../../../providers/websocket-service/websocket-service';
import { LoadingServiceProvider } from '../../../providers/loading-service/loading-service';
import { UtilServiceProvider } from '../../../providers/util-service/util-service';

@IonicPage({
  segment: 'meal-planners',
  priority: 'low'
})
@Component({
  selector: 'page-meal-plans',
  templateUrl: 'meal-plans.html',
})
export class MealPlansPage {

  mealPlans: any = [];

  initialLoadComplete: boolean = false;

  constructor(
    public navCtrl: NavController,
    public modalCtrl: ModalController,
    public toastCtrl: ToastController,
    public mealPlanService: MealPlanServiceProvider,
    public websocketService: WebsocketServiceProvider,
    public loadingService: LoadingServiceProvider,
    public utilService: UtilServiceProvider,
    public navParams: NavParams) {

    this.websocketService.register('mealPlan:received', () => {
      this.loadPlans();
    }, this);

    this.websocketService.register('mealPlan:removed', () => {
      this.loadPlans();
    }, this);
  }

  ionViewDidLoad() { }

  ionViewWillEnter() {
    var loading = this.loadingService.start();

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
      refresher.complete();
    }, () => {
      refresher.complete();
    });
  }

  loadPlans() {
    return new Promise((resolve, reject) => {
      this.mealPlanService.fetch().subscribe(response => {
        this.mealPlans = response;

        resolve();
      }, err => {
        reject();

        switch (err.status) {
          case 0:
            let offlineToast = this.toastCtrl.create({
              message: this.utilService.standardMessages.offlineFetchMessage,
              duration: 5000
            });
            offlineToast.present();
            break;
          case 401:
            this.navCtrl.setRoot('LoginPage', {}, { animate: true, direction: 'forward' });
            break;
          default:
            let errorToast = this.toastCtrl.create({
              message: this.utilService.standardMessages.unexpectedError,
              duration: 30000
            });
            errorToast.present();
            break;
        }
      });
    });
  }

  newMealPlan() {
    let modal = this.modalCtrl.create('NewMealPlanModalPage');
    modal.present();
    modal.onDidDismiss(data => {
      if (!data || !data.destination) return;

      if (data.setRoot) {
        this.navCtrl.setRoot(data.destination, data.routingData || {}, { animate: true, direction: 'forward' });
      } else {
        this.navCtrl.push(data.destination, data.routingData);
      }
    });
  }
  openMealPlan(mealPlanId) {
    // this.navCtrl.setRoot(RecipePage, {}, {animate: true, direction: 'forward'});
    this.navCtrl.push('MealPlanPage', {
      mealPlanId: mealPlanId
    });
  }

  formatItemCreationDate(plainTextDate) {
    return this.utilService.formatDate(plainTextDate, { now: true });
  }
}
