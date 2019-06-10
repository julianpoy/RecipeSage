import { Component } from '@angular/core';
import { NavController, ToastController, ModalController, AlertController } from '@ionic/angular';
import { LoadingService } from '@/services/loading.service';
import { MealPlanService } from '@/services/meal-plan.service';
import { UtilService } from '@/services/util.service';

@Component({
  selector: 'page-meal-plan-popover',
  templateUrl: 'meal-plan-popover.page.html',
  styleUrls: ['meal-plan-popover.page.scss']
})
export class MealPlanPopoverPage {

  viewOptions: any; // From nav params
  mealPlanId: any; // From nav params
  mealPlan: any; // From nav params

  constructor(
    public navCtrl: NavController,
    public utilService: UtilService,
    public loadingService: LoadingService,
    public mealPlanService: MealPlanService,
    public toastCtrl: ToastController,
    public modalCtrl: ModalController,
    public alertCtrl: AlertController
  ) {}

  ionViewDidLoad() { }

  saveViewOptions() {
    localStorage.setItem('mealPlan.showAddedBy', this.viewOptions.showAddedBy);
    localStorage.setItem('mealPlan.showAddedOn', this.viewOptions.showAddedOn);
    localStorage.setItem('mealPlan.startOfWeek', this.viewOptions.startOfWeek);

    this.modalCtrl.dismiss();
  }

  async deleteMealPlan() {
    let alert = await this.alertCtrl.create({
      header: 'Confirm Delete',
      message: 'This will <b>permanently</b> remove this meal plan from your account.<br /><br /><b>Note</b>: If you\'re only a collaborator on this meal plan, it\'ll only be removed from your account. If you own this meal plan, it will be removed from all other collaborators accounts.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => { }
        },
        {
          text: 'Delete',
          cssClass: 'alertDanger',
          handler: () => {
            this._deleteMealPlan();
          }
        }
      ]
    });
    alert.present();
  }

  _deleteMealPlan() {
    var loading = this.loadingService.start();

    this.mealPlanService.unlink({
      id: this.mealPlanId
    }).then(() => {
      loading.dismiss();

      this.modalCtrl.dismiss({
        setRoot: true,
        destination: 'MealPlansPage'
      });
    }).catch(async err => {
      loading.dismiss();
      switch (err.status) {
        case 0:
          (await this.toastCtrl.create({
            message: this.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          })).present();
          break;
        case 401:
          (await this.toastCtrl.create({
            message: this.utilService.standardMessages.unauthorized,
            duration: 6000
          })).present();
          break;
        default:
          (await this.toastCtrl.create({
            message: this.utilService.standardMessages.unexpectedError,
            duration: 6000
          })).present();
          break;
      }
    });
  }
}
