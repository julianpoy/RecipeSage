import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ToastController, ViewController, ModalController, AlertController } from 'ionic-angular';
import { LoadingServiceProvider } from '../../../providers/loading-service/loading-service';
import { RecipeServiceProvider } from '../../../providers/recipe-service/recipe-service';
import { UtilServiceProvider } from '../../../providers/util-service/util-service';
import { MealPlanServiceProvider } from '../../../providers/meal-plan-service/meal-plan-service';

import dayjs, { Dayjs } from 'dayjs'

@IonicPage({
  priority: 'low'
})
@Component({
  selector: 'page-add-recipe-to-meal-plan-modal',
  templateUrl: 'add-recipe-to-meal-plan-modal.html',
})
export class AddRecipeToMealPlanModalPage {

  recipe: any;

  mealPlans: any;

  selectedMealPlan: any;
  destinationMealPlan: any;
  meal: string;

  reference: any;

  selectedDay: Dayjs = dayjs(new Date());
  selectedMealGroup: any[] = [];

  viewOptions: any = {};

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public mealPlanService: MealPlanServiceProvider,
    public recipeService: RecipeServiceProvider,
    public loadingService: LoadingServiceProvider,
    public utilService: UtilServiceProvider,
    public toastCtrl: ToastController,
    public alertCtrl: AlertController,
    public viewCtrl: ViewController,
    public modalCtrl: ModalController
  ) {
    this.recipe = navParams.get('recipe');
    this.reference = navParams.get('reference');

    this.loadViewOptions();
  }

  ionViewWillEnter() {
    var loading = this.loadingService.start();
    this.loadMealPlans().then(() => {
      loading.dismiss();
    }, () => {
      loading.dismiss();
    });
  }

  selectLastUsedMealPlan() {
    let lastUsedMealPlanId = localStorage.getItem('lastUsedMealPlanId');
    let matchingPlans = this.mealPlans.filter(mealPlan => mealPlan.id === lastUsedMealPlanId);
    if (matchingPlans.length > 0 || this.mealPlans.length === 1) {
      this.selectedMealPlan = this.mealPlans[0];
      this.loadMealPlan(this.selectedMealPlan.id);
    }
  }

  saveLastUsedMealPlan() {
    localStorage.setItem('lastUsedMealPlanId', this.selectedMealPlan.id);
  }

  loadMealPlans() {
    return new Promise((resolve, reject) => {
      this.mealPlanService.fetch().subscribe(response => {
        this.mealPlans = response;

        this.selectLastUsedMealPlan();

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

  loadMealPlan(id) {
    return new Promise((resolve, reject) => {
      this.mealPlanService.fetchById(id).subscribe(response => {
        this.destinationMealPlan = response;

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

  loadViewOptions() {
    var defaults = {
      showAddedBy: false,
      showAddedOn: false,
      startOfWeek: 'monday'
    }

    this.viewOptions.showAddedBy = JSON.parse(localStorage.getItem('mealPlan.showAddedBy'));
    this.viewOptions.showAddedOn = JSON.parse(localStorage.getItem('mealPlan.showAddedOn'));
    this.viewOptions.startOfWeek = localStorage.getItem('mealPlan.startOfWeek') || null;

    for (var key in this.viewOptions) {
      if (this.viewOptions.hasOwnProperty(key)) {
        if (this.viewOptions[key] == null) {
          this.viewOptions[key] = defaults[key];
        }
      }
    }
  }

  currentScheduledMeals() {
    return this.selectedMealGroup.map(e => e.title).join(', ')
  }

  isFormValid() {
    if (!this.destinationMealPlan) return false;

    return this.meal && this.meal.length > 0;
  }

  save() {
    var loading = this.loadingService.start();

    this.saveLastUsedMealPlan();

    this.mealPlanService.addItem({
      id: this.destinationMealPlan.id,
      title: this.recipe.title,
      recipeId: this.recipe.id,
      meal: this.meal,
      scheduled: this.selectedDay.toDate()
    }).subscribe(response => {
      loading.dismiss();

      this.viewCtrl.dismiss();
    }, err => {
      loading.dismiss();
      switch (err.status) {
        case 0:
          this.toastCtrl.create({
            message: this.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          }).present();
          break;
        case 401:
          this.toastCtrl.create({
            message: this.utilService.standardMessages.unauthorized,
            duration: 6000
          }).present();
          break;
        default:
          this.toastCtrl.create({
            message: this.utilService.standardMessages.unexpectedError,
            duration: 6000
          }).present();
          break;
      }
    });
  }

  createMealPlan() {
    let modal = this.modalCtrl.create('NewMealPlanModalPage');
    modal.present();
    modal.onDidDismiss(data => {
      if (!data || !data.destination) return;

      if (data.setRoot) {
        // Ignore
      } else {
        // Ignore
      }

      // Check for new meal plans
      this.loadMealPlans().then(() => {
        if (this.mealPlans.length == 1) {
          this.selectedMealPlan = this.mealPlans[0];
          this.loadMealPlan(this.mealPlans[0].id);
        } else {
          this.toastCtrl.create({
            message: 'Excellent! Now select the meal plan you just created.',
            duration: 6000
          }).present();
        }
      });
    });
  }

  cancel() {
    this.viewCtrl.dismiss();
  }
}
