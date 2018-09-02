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

    this.websocketService.register('mealPlan:received', function () {
      this.loadPlans();
    }, this);

    this.websocketService.register('mealPlan:removed', function () {
      this.loadPlans();
    }, this);
  }

  ionViewDidLoad() { }

  ionViewWillEnter() {
    var loading = this.loadingService.start();

    var me = this;
    me.initialLoadComplete = false;

    this.loadPlans().then(function () {
      loading.dismiss();
      me.initialLoadComplete = true;
    }, function () {
      loading.dismiss();
      me.initialLoadComplete = true;
    });
  }

  refresh(refresher) {
    this.loadPlans().then(function () {
      refresher.complete();
    }, function () {
      refresher.complete();
    });
  }

  loadPlans() {
    var me = this;

    return new Promise(function (resolve, reject) {
      me.mealPlanService.fetch().subscribe(function (response) {
        me.mealPlans = response;

        resolve();
      }, function (err) {
        reject();

        switch (err.status) {
          case 0:
            let offlineToast = me.toastCtrl.create({
              message: me.utilService.standardMessages.offlineFetchMessage,
              duration: 5000
            });
            offlineToast.present();
            break;
          case 401:
            me.navCtrl.setRoot('LoginPage', {}, { animate: true, direction: 'forward' });
            break;
          default:
            let errorToast = me.toastCtrl.create({
              message: me.utilService.standardMessages.unexpectedError,
              duration: 30000
            });
            errorToast.present();
            break;
        }
      });
    });
  }

  newMealPlan() {
    var me = this;
    let modal = this.modalCtrl.create('NewMealPlanModalPage');
    modal.present();
    modal.onDidDismiss(data => {
      if (!data || !data.destination) return;

      if (data.setRoot) {
        me.navCtrl.setRoot(data.destination, data.routingData || {}, { animate: true, direction: 'forward' });
      } else {
        me.navCtrl.push(data.destination, data.routingData);
      }
    });
  }
  openMealPlan(mealPlanId) {
    // me.navCtrl.setRoot(RecipePage, {}, {animate: true, direction: 'forward'});
    this.navCtrl.push('MealPlanPage', {
      mealPlanId: mealPlanId
    });
  }

  formatItemCreationDate(plainTextDate) {
    return this.utilService.formatDate(plainTextDate, { now: true });
  }
}
