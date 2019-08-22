import { Component, Input } from '@angular/core';
import { NavController, ToastController, ModalController, AlertController } from '@ionic/angular';
import { LoadingService } from '@/services/loading.service';
import { RecipeService } from '@/services/recipe.service';
import { UtilService, RouteMap, AuthType } from '@/services/util.service';
import { MealPlanService } from '@/services/meal-plan.service';

import dayjs, { Dayjs } from 'dayjs'

@Component({
  selector: 'page-add-recipe-to-meal-plan-modal',
  templateUrl: 'add-recipe-to-meal-plan-modal.page.html',
  styleUrls: ['add-recipe-to-meal-plan-modal.page.scss']
})
export class AddRecipeToMealPlanModalPage {

  @Input() recipe: any;

  mealPlans: any;

  selectedMealPlan: any;
  destinationMealPlan: any;
  meal: string;

  @Input() reference: any;

  selectedDay: Dayjs = dayjs(new Date());
  selectedMealGroup: any[] = [];

  viewOptions: any = {};

  constructor(
    public navCtrl: NavController,
    public mealPlanService: MealPlanService,
    public recipeService: RecipeService,
    public loadingService: LoadingService,
    public utilService: UtilService,
    public toastCtrl: ToastController,
    public alertCtrl: AlertController,
    public modalCtrl: ModalController
  ) {
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
      this.mealPlanService.fetch().then(response => {
        this.mealPlans = response;

        this.selectLastUsedMealPlan();

        resolve();
      }).catch(async err => {
        reject();

        switch (err.response.status) {
          case 0:
            let offlineToast = await this.toastCtrl.create({
              message: this.utilService.standardMessages.offlineFetchMessage,
              duration: 5000
            });
            offlineToast.present();
            break;
          case 401:
            this.navCtrl.navigateRoot(RouteMap.AuthPage.getPath(AuthType.Login));
            break;
          default:
            let errorToast = await this.toastCtrl.create({
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
      this.mealPlanService.fetchById(id).then(response => {
        this.destinationMealPlan = response;

        resolve();
      }).catch(async err => {
        reject();

        switch (err.response.status) {
          case 0:
            let offlineToast = await this.toastCtrl.create({
              message: this.utilService.standardMessages.offlineFetchMessage,
              duration: 5000
            });
            offlineToast.present();
            break;
          case 401:
            this.navCtrl.navigateRoot(RouteMap.AuthPage.getPath(AuthType.Login));
            break;
          default:
            let errorToast = await this.toastCtrl.create({
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
    }).then(response => {
      loading.dismiss();

      this.modalCtrl.dismiss();
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

  async createMealPlan() {
    let modal = await this.modalCtrl.create({
      component: 'NewMealPlanModalPage'
    });
    modal.present();
    modal.onDidDismiss().then(({ data }) => {
      // TODO: This needs to know whether aforementioned operation was successful. Data should contain a success bool

      // Check for new meal plans
      this.loadMealPlans().then(async () => {
        if (this.mealPlans.length == 1) {
          this.selectedMealPlan = this.mealPlans[0];
          this.loadMealPlan(this.mealPlans[0].id);
        } else {
          (await this.toastCtrl.create({
            message: 'Excellent! Now select the meal plan you just created.',
            duration: 6000
          })).present();
        }
      });
    });
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
