import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ViewController, ToastController } from 'ionic-angular';

import { LoadingServiceProvider } from '../../../providers/loading-service/loading-service';
import { MessagingServiceProvider } from '../../../providers/messaging-service/messaging-service';
import { MealPlanServiceProvider } from '../../../providers/meal-plan-service/meal-plan-service';
import { UtilServiceProvider } from '../../../providers/util-service/util-service';

@IonicPage({
  priority: 'low'
})
@Component({
  selector: 'page-new-meal-plan-modal',
  templateUrl: 'new-meal-plan-modal.html',
})
export class NewMealPlanModalPage {

  mealPlanTitle: string = '';

  selectedThreads: any = [];

  constructor(
    public navCtrl: NavController,
    public viewCtrl: ViewController,
    public loadingService: LoadingServiceProvider,
    public mealPlanService: MealPlanServiceProvider,
    public messagingService: MessagingServiceProvider,
    public utilService: UtilServiceProvider,
    public toastCtrl: ToastController,
    public navParams: NavParams) {

  }

  ionViewDidLoad() {}

  save() {
    var me = this;

    var loading = this.loadingService.start();

    this.mealPlanService.create({
      title: this.mealPlanTitle,
      collaborators: this.selectedThreads
    }).subscribe(function (response) {
      loading.dismiss();
      me.viewCtrl.dismiss({
        destination: 'MealPlanPage',
        routingData: {
          mealPlanId: response.id
        },
        setRoot: false
      });
    }, function (err) {
      loading.dismiss();
      switch (err.status) {
        case 0:
          let offlineToast = me.toastCtrl.create({
            message: me.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          });
          offlineToast.present();
          break;
        case 401:
          me.viewCtrl.dismiss({
            destination: 'LoginPage',
            setRoot: true
          });
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
  }

  cancel() {
    this.viewCtrl.dismiss({
      destination: false
    });
  }
}
