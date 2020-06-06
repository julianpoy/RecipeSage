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

  mealsByDate = {};

  itemsByRecipeId: any = {};
  recipeIds: any = [];

  preferences = this.preferencesService.preferences;
  preferenceKeys = MealPlanPreferenceKey;

  selectedDays: number[];

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

  _addItem(item) {
    const loading = this.loadingService.start();

    this.mealPlanService.addItem({
      id: this.mealPlanId,
      title: item.title,
      recipeId: item.recipeId || null,
      meal: item.meal,
      scheduled: item.scheduled
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
        scheduled: new Date(this.selectedDays[0])
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

    await popover.present();

    const { data } = await popover.onDidDismiss();

    if (data?.reload) this.mealPlanCalendar.generateCalendar();
    if (data?.copy) this.startBulkCopy();
    if (data?.move) this.startBulkMove();
    if (data?.delete) this.bulkDelete();
  }

  async itemClicked(mealItem) {
    const modal = await this.modalCtrl.create({
      component: MealPlanItemDetailsModalPage,
      componentProps: {
        mealItem,
        mealPlanId: this.mealPlanId
      },
    });
    modal.present();

    const { data } = await modal.onDidDismiss();
    if (data?.reference) this.reference = data.reference;
    if (data?.refresh) this.loadWithProgress();
  }

  async itemMoved({ day, mealItem }) {
    console.log(day, mealItem)
    const modal = await this.modalCtrl.create({
      component: NewMealPlanItemModalPage,
      componentProps: {
        isEditing: true,
        inputType: mealItem.recipe ? 'recipe' : 'manualEntry',
        title: mealItem.title,
        recipe: mealItem.recipe,
        scheduled: day,
        meal: mealItem.meal
      }
    });
    modal.present();

    const { data } = await modal.onDidDismiss();
    if (!data || !data.item) return;
    const item = data.item;

    const loading = this.loadingService.start();
    const response = await this.mealPlanService.updateMealPlanItems(this.mealPlanId, [{
      id: mealItem.id,
      title: item.title,
      recipeId: item.recipeId,
      scheduled: item.scheduled,
      meal: item.meal
    }]);
    loading.dismiss();

    if (response) {
      this.reference = response.reference;
      this.loadWithProgress();
    }
  }

  getItemsOnDay(unix: number) {
    const day = dayjs(unix);
    return this.mealsByDate?.[day.year()]?.[day.month()]?.[day.date()]?.items || [];
  }

  getSelectedMealItemCount(): number {
    return this.selectedDays.map(unix => this.getItemsOnDay(unix).length).reduce((acc, el) => acc + el, 0);
  }

  dayCopyInProgress: boolean = false;
  dayMoveInProgress: boolean = false;
  selectedDaysInProgress;
  async startBulkCopy() {
    this.dayCopyInProgress = false;

    if (this.getSelectedMealItemCount() === 0) {
      const alert = await this.alertCtrl.create({
        header: 'Empty day(s) selected',
        message: 'The day(s) you\'ve selected do not contain any meal plan items. To copy items, you\'ll need to select at least one day with meal plan items.',
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel'
          },
          {
            text: 'Ok',
            handler: () => {
              this.dayCopyInProgress = true;
              this.selectedDaysInProgress = [...this.selectedDays];
            }
          }
        ]
      });
      alert.present();

      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Copy To',
      message: 'This will copy the meal items on the selected days to a series of days starting on the day you select.<br /><br />Please click the day you\'d like to copy to.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Ok',
          handler: () => {
            this.dayCopyInProgress = true;
            this.selectedDaysInProgress = [...this.selectedDays];
          }
        }
      ]
    });
    alert.present();
  }

  async startBulkMove() {
    this.dayMoveInProgress = false;

    if (this.getSelectedMealItemCount() === 0) {
      const alert = await this.alertCtrl.create({
        header: 'Empty day(s) selected',
        message: 'The day(s) you\'ve selected do not contain any meal plan items. To move items, you\'ll need to select at least one day with meal plan items.',
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel'
          },
          {
            text: 'Ok',
            handler: () => {
              this.dayCopyInProgress = true;
              this.selectedDaysInProgress = [...this.selectedDays];
            }
          }
        ]
      });
      alert.present();

      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Move To',
      message: 'This will move the meal items on the selected days to a series of days starting on the day you select.<br /><br />Please click the day you\'d like to move to.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Ok',
          handler: () => {
            this.dayMoveInProgress = true;
            this.selectedDaysInProgress = [...this.selectedDays];
          }
        }
      ]
    });
    alert.present();
  }

  async bulkDelete() {
    this.dayMoveInProgress = false;

    if (this.getSelectedMealItemCount() === 0) {
      const alert = await this.alertCtrl.create({
        header: 'Empty day(s) selected',
        message: 'The day(s) you\'ve selected do not contain any meal plan items. To delete items, you\'ll need to select at least one day with meal plan items.',
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel'
          },
          {
            text: 'Ok',
            handler: () => {
              this.dayCopyInProgress = true;
              this.selectedDaysInProgress = [...this.selectedDays];
            }
          }
        ]
      });
      alert.present();

      return;
    }

    const selectedDayList = this.selectedDays.map(day => dayjs(day).format('MMM D')).join(', ');

    const alert = await this.alertCtrl.create({
      header: 'Delete Meal Plan Items',
      message: `This will delete all items on ${selectedDayList}`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Ok',
          handler: () => {
            this._deleteSelected();
          }
        }
      ]
    });
    alert.present();
  }

  async dayClicked(day) {
    if (this.dayMoveInProgress || this.dayCopyInProgress) {
      const selectedDayList = this.selectedDaysInProgress.map(day => dayjs(day).format('MMM D')).join(', ');
      const destDay = dayjs(day).format('MMM D');

      if (this.dayCopyInProgress) {
        const alert = await this.alertCtrl.create({
          header: 'Copy To',
          message: `This will copy the meal items on ${selectedDayList} to ${this.selectedDaysInProgress.length > 1 ? 'the days on and following ' : ''}${destDay}.`,
          buttons: [
            {
              text: 'Cancel Copy',
              role: 'cancel',
              handler: () => {
                this.dayCopyInProgress = false;
              }
            },
            {
              text: 'Select Another Day'
            },
            {
              text: 'Ok',
              handler: async () => {
                this.dayCopyInProgress = false;
                this._copySelectedTo(day);
              }
            }
          ]
        });
        alert.present();
      }

      if (this.dayMoveInProgress) {
        const alert = await this.alertCtrl.create({
          header: 'Move All Selected Items',
          message: `This will move the meal items on ${selectedDayList} to ${this.selectedDaysInProgress.length > 1 ? 'the days on and following ' : ''}${destDay}.`,
          buttons: [
            {
              text: 'Cancel Copy',
              role: 'cancel',
              handler: () => {
                this.dayMoveInProgress = false;
              }
            },
            {
              text: 'Select Another Day'
            },
            {
              text: 'Ok',
              handler: async () => {
                this.dayMoveInProgress = false;
                this._moveSelectedTo(day);
              }
            }
          ]
        });
        alert.present();
      }
    }
  }

  async _moveSelectedTo(day) {
    const dayDiff = dayjs(day).diff(this.selectedDaysInProgress[0], 'day');

    const updatedItems = this.selectedDaysInProgress.map(day =>
     this.getItemsOnDay(day).map(item => ({
       id: item.id,
       title: item.title,
       recipeId: item.recipeId,
       scheduled: dayjs(item.scheduled).add(dayDiff, 'day').toDate(),
       meal: item.meal
     }))
    ).flat();

    const loading = this.loadingService.start();
    const response = await this.mealPlanService.updateMealPlanItems(this.mealPlanId, updatedItems);
    loading.dismiss();

    if (response) {
      this.reference = response.reference;
      this.loadWithProgress();
    }
  }

  async _copySelectedTo(day) {
    const dayDiff = dayjs(day).diff(this.selectedDaysInProgress[0], 'day');

    const newItems = this.selectedDaysInProgress.map(day =>
     this.getItemsOnDay(day).map(item => ({
       title: item.title,
       recipeId: item.recipeId,
       scheduled: dayjs(item.scheduled).add(dayDiff, 'day').toDate(),
       meal: item.meal
     }))
    ).flat();

    const loading = this.loadingService.start();
    const response = await this.mealPlanService.addMealPlanItems(this.mealPlanId, newItems);
    loading.dismiss();

    if (response) {
      this.reference = response.reference;
      this.loadWithProgress();
    }
  }

  async _deleteSelected() {
    const itemIds = this.selectedDays.map(day => this.getItemsOnDay(day).map(item => item.id)).flat();

    const loading = this.loadingService.start();
    const response = await this.mealPlanService.deleteMealPlanItems(this.mealPlanId, itemIds);
    loading.dismiss();

    if (response) {
      this.reference = response.reference;
      this.loadWithProgress();
    }
  }

  setMealsByDate(mealsByDate) {
    this.mealsByDate = mealsByDate;
  }

  setSelectedDays(selectedDays) {
    this.selectedDays = selectedDays;
  }
}
