import { Component } from '@angular/core';
import { NavController, ModalController, ToastController } from '@ionic/angular';

import { LoadingService } from '@/services/loading.service';
import { MessagingService } from '@/services/messaging.service';
import { MealPlanService } from '@/services/meal-plan.service';
import { UtilService, RouteMap, AuthType } from '@/services/util.service';

@Component({
  selector: 'page-new-meal-plan-modal',
  templateUrl: 'new-meal-plan-modal.page.html',
  styleUrls: ['new-meal-plan-modal.page.scss']
})
export class NewMealPlanModalPage {

  mealPlanTitle = '';

  selectedThreads: any = [];

  constructor(
    public navCtrl: NavController,
    public modalCtrl: ModalController,
    public loadingService: LoadingService,
    public mealPlanService: MealPlanService,
    public messagingService: MessagingService,
    public utilService: UtilService,
    public toastCtrl: ToastController) {

  }

  save() {
    const loading = this.loadingService.start();

    this.mealPlanService.create({
      title: this.mealPlanTitle,
      collaborators: this.selectedThreads
    }).then(response => {
      loading.dismiss();
      this.modalCtrl.dismiss({
        success: true
      });
      this.navCtrl.navigateForward(RouteMap.MealPlanPage.getPath(response.id));
    }).catch(async err => {
      loading.dismiss();
      switch (err.response.status) {
        case 0:
          const offlineToast = await this.toastCtrl.create({
            message: this.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          });
          offlineToast.present();
          break;
        case 401:
          this.modalCtrl.dismiss({
            success: false
          });
          this.navCtrl.navigateRoot(RouteMap.AuthPage.getPath(AuthType.Login));
          break;
        default:
          const errorToast = await this.toastCtrl.create({
            message: this.utilService.standardMessages.unexpectedError,
            showCloseButton: true
          });
          errorToast.present();
          break;
      }
    });
  }

  cancel() {
    this.modalCtrl.dismiss({
      success: false
    });
  }
}
