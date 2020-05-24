import { Component, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, ToastController, ModalController, PopoverController, AlertController } from '@ionic/angular';
import dayjs, { Dayjs } from 'dayjs';

import { LoadingService } from '@/services/loading.service';
import { MealPlanService } from '@/services/meal-plan.service';
import { WebsocketService } from '@/services/websocket.service';
import { UtilService, RouteMap, AuthType } from '@/services/util.service';
import { RecipeService } from '@/services/recipe.service';
import { ShoppingListService } from '@/services/shopping-list.service';
import { PreferencesService, MealPlanPreferenceKey } from '@/services/preferences.service';

import { MealCalendarComponent } from '@/components/meal-calendar/meal-calendar.component';
import { NewMealPlanItemModalPage } from '../new-meal-plan-item-modal/new-meal-plan-item-modal.page';
import { AddRecipeToShoppingListModalPage } from '@/pages/recipe-components/add-recipe-to-shopping-list-modal/add-recipe-to-shopping-list-modal.page';
import { MealPlanPopoverPage } from '@/pages/meal-plan-components/meal-plan-popover/meal-plan-popover.page';
import { MealPlanItemDetailsModalPage } from '@/pages/meal-plan-components/meal-plan-item-details-modal/meal-plan-item-details-modal.page';

@Component({
  selector: 'page-meal-plan',
  templateUrl: 'meal-plan.page.html',
  styleUrls: ['meal-plan.page.scss']
})
export class MealPlanPage {

  defaultBackHref: string = RouteMap.MealPlansPage.getPath();

  calendarMode: string = window.innerWidth > 600 ? "full" : "split";

  mealPlanId: string; // From nav params
  mealPlan: any = { items: [], collaborators: [] };
  selectedMealGroup: any = [];

  itemsByRecipeId: any = {};
  recipeIds: any = [];

  preferences = this.preferencesService.preferences;
  preferenceKeys = MealPlanPreferenceKey;

  selectedDay: Dayjs = dayjs(new Date());

  reference = 0;

  @ViewChild(MealCalendarComponent, { static: true }) mealPlanCalendar: MealCalendarComponent;

  constructor(
    public route: ActivatedRoute,
    public navCtrl: NavController,
    public loadingService: LoadingService,
    public mealPlanService: MealPlanService,
    public shoppingListService: ShoppingListService,
    public recipeService: RecipeService,
    public websocketService: WebsocketService,
    public utilService: UtilService,
    public preferencesService: PreferencesService,
    public toastCtrl: ToastController,
    public modalCtrl: ModalController,
    public popoverCtrl: PopoverController,
    public alertCtrl: AlertController) {
    this.mealPlanId = this.route.snapshot.paramMap.get('mealPlanId');

    this.websocketService.register('mealPlan:itemsUpdated', payload => {
      if (payload.mealPlanId === this.mealPlanId && payload.reference !== this.reference) {
        this.loadMealPlan();
      }
    }, this);
  }

  ionViewWillEnter() {
    this.loadWithProgress();
  }

  refresh(loader) {
    this.loadMealPlan().then(() => {
      loader.target.complete();
    }, () => {
      loader.target.complete();
    });
  }

  loadWithProgress() {
    const loading = this.loadingService.start();
    this.loadMealPlan().finally(() => {
      loading.dismiss();
    });
  }

  loadMealPlan() {
    return new Promise((resolve, reject) => {
      this.mealPlanService.fetchById(this.mealPlanId).then(response => {
        this.mealPlan = response;

        resolve();
      }).catch(async err => {
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
          case 404:
            let errorToast = await this.toastCtrl.create({
              message: 'Meal plan not found. Does this meal plan URL exist?',
              duration: 30000,
              // dismissOnPageChange: true
            });
            errorToast.present();

            this.navCtrl.navigateRoot(RouteMap.MealPlansPage.getPath());
            break;
          default:
            errorToast = await this.toastCtrl.create({
              message: this.utilService.standardMessages.unexpectedError,
              duration: 30000
            });
            errorToast.present();
            break;
        }

        reject();
      });
    });
  }

  async removeItem(item) {
    const alert = await this.alertCtrl.create({
      header: 'Confirm Removal',
      message: 'This will remove "' + (item.recipe || item).title + '" from this meal plan.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Remove',
          handler: () => {
            this._removeItem(item);
          }
        }
      ]
    });
    alert.present();
  }

  _removeItem(item) {
    const loading = this.loadingService.start();

    this.mealPlanService.remove({
      id: this.mealPlanId,
      itemId: item.id
    }).then(response => {
      this.reference = response.reference || 0;

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

  async newMealPlanItem() {
    const modal = await this.modalCtrl.create({
      component: NewMealPlanItemModalPage,
      componentProps: {
        scheduled: this.selectedDay.toDate()
      }
    });
    modal.present();
    modal.onDidDismiss().then(({ data }) => {
      if (!data || !data.item) return;
      this._addItem(data.item);
    });
  }

  formatItemCreationDate(plainTextDate) {
    return this.utilService.formatDate(plainTextDate, { now: true });
  }

  openRecipe(recipe) {
    this.navCtrl.navigateForward(RouteMap.RecipePage.getPath(recipe.id));
  }

  addMealPlanItemToShoppingList(mealPlanItem) {
    // Fetch complete recipe (this page is provided with only topical recipe details)
    this.recipeService.fetchById(mealPlanItem.recipe.id).then(async response => {
      const addRecipeToShoppingListModal = await this.modalCtrl.create({
        component: AddRecipeToShoppingListModalPage,
        componentProps: {
          recipe: response,
          reference: mealPlanItem.id
        }
      });
      addRecipeToShoppingListModal.present();
    }).catch(async err => {
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
        case 404:
          let errorToast = await this.toastCtrl.create({
            message: 'Recipe not found. Does this recipe URL exist?',
            duration: 30000,
            // dismissOnPageChange: true
          });
          errorToast.present();
          break;
        default:
          errorToast = await this.toastCtrl.create({
            message: this.utilService.standardMessages.unexpectedError,
            duration: 30000
          });
          errorToast.present();
          break;
      }
    });
  }

  async removeMealPlanItemFromShoppingList(mealPlanItem) {
    const alert = await this.alertCtrl.create({
      header: 'Confirm Removal',
      message: 'This will remove the linked copy of "' + (mealPlanItem.recipe || mealPlanItem).title + '" from your shopping list.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Remove',
          handler: () => {
            this._removeMealPlanItemFromShoppingList(mealPlanItem);
          }
        }
      ]
    });
    alert.present();
  }

  _removeMealPlanItemFromShoppingList(mealPlanItem) {
    const elIds = mealPlanItem.shoppingListItems.map(el => {
      return el.id;
    });

    const loading = this.loadingService.start();

    this.shoppingListService.remove({
      id: mealPlanItem.shoppingListId,
      items: elIds
    }).then(response => {
      loading.dismiss();

      delete mealPlanItem.shoppingListItems;
      delete mealPlanItem.shoppingListId;
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

  async presentPopover(event) {
    const popover = await this.popoverCtrl.create({
      component: MealPlanPopoverPage,
      componentProps: {
        mealPlanId: this.mealPlanId,
        mealPlan: this.mealPlan
      },
      event
    });

    popover.onDidDismiss().then(() => {
      this.mealPlanCalendar.generateCalendar();
    });

    popover.present();
  }

  async itemClicked(mealItem) {
    const modal = await this.modalCtrl.create({
      component: MealPlanItemDetailsModalPage,
      componentProps: {
        mealItem
      },
    });

    modal.onDidDismiss().then(() => {
      this.loadMealPlan();
    });

    modal.present();
  }
  itemMoved({ day, mealItem }) {
    console.log(day, mealItem)
    alert(`you moved: ${mealItem.title} to ${day.format()}`)
  }
}
