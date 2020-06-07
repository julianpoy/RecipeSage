import { Component } from '@angular/core';
import { NavController, ToastController, ModalController, AlertController, PopoverController } from '@ionic/angular';
import { LoadingService } from '@/services/loading.service';
import { MealPlanService } from '@/services/meal-plan.service';
import { UtilService, RouteMap } from '@/services/util.service';
import { PreferencesService, MealPlanPreferenceKey } from '@/services/preferences.service';

@Component({
  selector: 'page-meal-plan-popover',
  templateUrl: 'meal-plan-popover.page.html',
  styleUrls: ['meal-plan-popover.page.scss']
})
export class MealPlanPopoverPage {

  preferences = this.preferencesService.preferences;
  preferenceKeys = MealPlanPreferenceKey;

  mealPlanId: any; // From nav params
  mealPlan: any; // From nav params

  constructor(
    public popoverCtrl: PopoverController,
    public navCtrl: NavController,
    public utilService: UtilService,
    public preferencesService: PreferencesService,
    public loadingService: LoadingService,
    public mealPlanService: MealPlanService,
    public toastCtrl: ToastController,
    public alertCtrl: AlertController
  ) {}

  savePreferences() {
    this.preferencesService.save();

    this.popoverCtrl.dismiss({
      reload: true
    });
  }

  dismiss() {
    this.popoverCtrl.dismiss();
  }

  copySelected() {
    this.popoverCtrl.dismiss({
      copy: true
    });
  }

  moveSelected() {
    this.popoverCtrl.dismiss({
      move: true
    });
  }

  deleteSelected() {
    this.popoverCtrl.dismiss({
      delete: true
    });
  }

  async deleteMealPlan() {
    const alert = await this.alertCtrl.create({
      header: 'Confirm Delete',
      message: `This will <b>permanently</b> remove this meal plan from your account.<br /><br />
                <b>Note</b>: If you\'re only a collaborator on this meal plan, it\'ll only be removed from your account.
                If you own this meal plan, it will be removed from all other collaborators accounts.`,
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
    const loading = this.loadingService.start();

    this.mealPlanService.unlink({
      id: this.mealPlanId
    }).then(() => {
      loading.dismiss();

      this.popoverCtrl.dismiss();

      this.navCtrl.navigateBack(RouteMap.MealPlansPage.getPath());
    }).catch(async err => {
      loading.dismiss();
      switch (err.response.status) {
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
