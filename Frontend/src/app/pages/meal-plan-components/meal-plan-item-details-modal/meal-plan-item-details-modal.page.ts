import { Input, Component } from '@angular/core';
import { NavController, ModalController, ToastController } from '@ionic/angular';
import { RecipeService } from '@/services/recipe.service';
import { LoadingService } from '@/services/loading.service';
import { UtilService, RouteMap } from '@/services/util.service';

import { NewMealPlanItemModalPage } from '../new-meal-plan-item-modal/new-meal-plan-item-modal.page';

import dayjs, { Dayjs } from 'dayjs';

@Component({
  selector: 'page-meal-plan-item-details-modal',
  templateUrl: 'meal-plan-item-details-modal.page.html',
  styleUrls: ['meal-plan-item-details-modal.page.scss']
})
export class MealPlanItemDetailsModalPage {

  @Input() mealItem;

  constructor(
    public navCtrl: NavController,
    public modalCtrl: ModalController,
    public recipeService: RecipeService,
    public loadingService: LoadingService,
    public utilService: UtilService,
    public toastCtrl: ToastController) {
  }

  openRecipe() {
    this.navCtrl.navigateForward(RouteMap.RecipePage.getPath(this.mealItem.recipe.id));
    this.close();
  }

  async edit() {
    const modal = await this.modalCtrl.create({
      component: NewMealPlanItemModalPage,
      componentProps: {
        isEditing: true,
        inputType: !!this.mealItem.recipe,
        title: this.mealItem.title,
        recipe: this.mealItem.recipe,
        date: this.mealItem.date,
        meal: this.mealItem.meal
      }
    });
    modal.present();
    modal.onDidDismiss().then(({ data }) => {
      if (!data || !data.item) return;
      this._updateItem(data.item);
    });
  }

  async _updateItem(item) {
    const loading = this.loadingService.start();

    try {
      const response = await this.mealPlanService.addItem({
        id: this.mealPlanId,
        title: item.title,
        recipeId: item.recipeId || null,
        meal: item.meal,
        scheduled: item.date
      });

      this.close({
        refresh: true,
        reference: response.reference
      });
    } catch(async err => {
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

    loading.dismiss();
  }

  async clone() {

  }

  _addItem(item) {
    const loading = this.loadingService.start();

    this.mealPlanService.addItem({
      id: this.mealPlanId,
      title: item.title,
      recipeId: item.recipeId || null,
      meal: item.meal,
      scheduled: item.date
    }).then(response => {
      this.reference = response.reference;

      this.loadMealPlan().then(loading.dismiss);
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

  async delete() {

  }

  formatDate(date) {
    return dayjs(date).format('YYYY-MM-DD');
  }

  close(args?) {
    this.modalCtrl.dismiss(args);
  }
}
