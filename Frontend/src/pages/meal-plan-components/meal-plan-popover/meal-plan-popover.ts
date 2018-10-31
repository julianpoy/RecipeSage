import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ToastController, ViewController, AlertController } from 'ionic-angular';
import { LoadingServiceProvider } from '../../../providers/loading-service/loading-service';
import { ShoppingListServiceProvider } from '../../../providers/shopping-list-service/shopping-list-service';
import { UtilServiceProvider } from '../../../providers/util-service/util-service';

@IonicPage({
  priority: 'low'
})
@Component({
  selector: 'page-meal-plan-popover',
  templateUrl: 'meal-plan-popover.html',
})
export class MealPlanPopoverPage {

  viewOptions: any;
  mealPlanId: any;
  mealPlan: any;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public utilService: UtilServiceProvider,
    public loadingService: LoadingServiceProvider,
    public shoppingListService: ShoppingListServiceProvider,
    public toastCtrl: ToastController,
    public viewCtrl: ViewController,
    public alertCtrl: AlertController
  ) {
    this.viewOptions = navParams.get('viewOptions');
    this.mealPlanId = navParams.get('mealPlanId');
    this.mealPlan = navParams.get('mealPlan');
  }

  ionViewDidLoad() { }

  saveViewOptions() {
    localStorage.setItem('mealPlan.showAddedBy', this.viewOptions.showAddedBy);
    localStorage.setItem('mealPlan.showAddedOn', this.viewOptions.showAddedOn);
    localStorage.setItem('mealPlan.startOfWeek', this.viewOptions.startOfWeek);

    this.viewCtrl.dismiss();
  }

  deleteMealPlan() {
    let alert = this.alertCtrl.create({
      title: 'Confirm Delete',
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
    var me = this;
    var loading = this.loadingService.start();

    this.shoppingListService.unlink({
      id: this.mealPlanId
    }).subscribe(function () {
      loading.dismiss();

      me.viewCtrl.dismiss({
        setRoot: true,
        destination: 'MealPlansPage'
      });
    }, function (err) {
      loading.dismiss();
      switch (err.status) {
        case 0:
          me.toastCtrl.create({
            message: me.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          }).present();
          break;
        case 401:
          me.toastCtrl.create({
            message: me.utilService.standardMessages.unauthorized,
            duration: 6000
          }).present();
          break;
        default:
          me.toastCtrl.create({
            message: me.utilService.standardMessages.unexpectedError,
            duration: 6000
          }).present();
          break;
      }
    });
  }
}
