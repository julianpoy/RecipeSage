import { Component, Input } from '@angular/core';
import { NavController, ToastController, ModalController, AlertController } from '@ionic/angular';
import dayjs, { Dayjs } from 'dayjs';

import { LoadingService } from '@/services/loading.service';
import { RecipeService } from '@/services/recipe.service';
import { UtilService, RouteMap, AuthType } from '@/services/util.service';
import { MealPlanService } from '@/services/meal-plan.service';

import { NewMealPlanModalPage } from '@/pages/meal-plan-components/new-meal-plan-modal/new-meal-plan-modal.page';

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

  selectedDays: number[] = [];

  constructor(
    public navCtrl: NavController,
    public mealPlanService: MealPlanService,
    public recipeService: RecipeService,
    public loadingService: LoadingService,
    public utilService: UtilService,
    public toastCtrl: ToastController,
    public alertCtrl: AlertController,
    public modalCtrl: ModalController
  ) {}

  ionViewWillEnter() {
    const loading = this.loadingService.start();
    this.loadMealPlans().then(() => {
      loading.dismiss();
    }, () => {
      loading.dismiss();
    });
  }

  selectLastUsedMealPlan() {
    const lastUsedMealPlanId = localStorage.getItem('lastUsedMealPlanId');
    const matchingPlans = this.mealPlans.filter(mealPlan => mealPlan.id === lastUsedMealPlanId);
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

  loadMealPlan(id) {
    return new Promise((resolve, reject) => {
      this.mealPlanService.fetchById(id).then(response => {
        this.destinationMealPlan = response;

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

  isFormValid() {
    if (!this.destinationMealPlan) return false;

    return this.meal && this.meal.length > 0;
  }

  save() {
    const loading = this.loadingService.start();

    this.saveLastUsedMealPlan();

    this.mealPlanService.addItem({
      id: this.destinationMealPlan.id,
      title: this.recipe.title,
      recipeId: this.recipe.id,
      meal: this.meal,
      scheduled: new Date(this.selectedDays[0])
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
    const modal = await this.modalCtrl.create({
      component: NewMealPlanModalPage
    });
    modal.present();
    modal.onDidDismiss().then(({ data }) => {
      if (!data || !data.success) return;

      // Check for new meal plans
      this.loadMealPlans().then(async () => {
        if (this.mealPlans.length === 1) {
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
