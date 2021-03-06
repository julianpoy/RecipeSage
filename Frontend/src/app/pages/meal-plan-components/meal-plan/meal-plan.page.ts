import { Component, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, ToastController, ModalController, PopoverController, AlertController } from '@ionic/angular';
import dayjs, { Dayjs } from 'dayjs';

import { LoadingService } from '@/services/loading.service';
import { MealPlanService } from '@/services/meal-plan.service';
import { WebsocketService } from '@/services/websocket.service';
import { UtilService, RouteMap, AuthType } from '@/services/util.service';
import { ShoppingListService } from '@/services/shopping-list.service';
import { PreferencesService, MealPlanPreferenceKey } from '@/services/preferences.service';

import { MealCalendarComponent } from '@/components/meal-calendar/meal-calendar.component';
import { NewMealPlanItemModalPage } from '../new-meal-plan-item-modal/new-meal-plan-item-modal.page';
import { MealPlanPopoverPage } from '@/pages/meal-plan-components/meal-plan-popover/meal-plan-popover.page';
import { MealPlanItemDetailsModalPage } from '@/pages/meal-plan-components/meal-plan-item-details-modal/meal-plan-item-details-modal.page';
import { MealPlanBulkPinModalPage } from '@/pages/meal-plan-components/meal-plan-bulk-pin-modal';
import { AddRecipeToShoppingListModalPage } from '@/pages/recipe-components/add-recipe-to-shopping-list-modal/add-recipe-to-shopping-list-modal.page';

@Component({
  selector: 'page-meal-plan',
  templateUrl: 'meal-plan.page.html',
  styleUrls: ['meal-plan.page.scss']
})
export class MealPlanPage {

  defaultBackHref: string = RouteMap.MealPlansPage.getPath();

  calendarMode: string = window.innerWidth > 600 ? 'full' : 'split';
  dayCopyInProgress = false;
  dayMoveInProgress = false;
  selectedDaysInProgress;

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
    if (data?.pinRecipes) this.bulkPinRecipes();
    if (data?.bulkAddToShoppingList) this.bulkAddToShoppingList();
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

  async emptyDaysSelectedAlert(attemptedAction: string, okCb?: () => any) {
    const emptyAlert = await this.alertCtrl.create({
      header: 'Empty day(s) selected',
      message: `The day(s) you\'ve selected do not contain any meal plan items. To ${attemptedAction}, you\'ll need to select at least one day with meal plan items.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Ok',
          handler: () => {
            if (okCb) okCb();
          }
        }
      ]
    });
    await emptyAlert.present();
  }

  async startBulkCopy() {
    this.dayCopyInProgress = false;

    if (this.getSelectedMealItemCount() === 0) {
      this.emptyDaysSelectedAlert('copy items');
      return;
    }

    const copyAlert = await this.alertCtrl.create({
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
    copyAlert.present();
  }

  async startBulkMove() {
    this.dayMoveInProgress = false;

    if (this.getSelectedMealItemCount() === 0) {
      this.emptyDaysSelectedAlert('move items');
      return;
    }

    const moveAlert = await this.alertCtrl.create({
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
    moveAlert.present();
  }

  async bulkDelete() {
    if (this.getSelectedMealItemCount() === 0) {
      this.emptyDaysSelectedAlert('delete items');
      return;
    }

    const selectedDayList = this.selectedDays.map(day => dayjs(day).format('MMM D')).join(', ');

    const deleteAlert = await this.alertCtrl.create({
      header: 'Delete Meal Plan Items',
      message: `This will delete all items on ${selectedDayList}`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          cssClass: 'alertDanger',
          handler: () => {
            this._deleteSelected();
          }
        }
      ]
    });
    deleteAlert.present();
  }

  async bulkPinRecipes() {
    if (this.getSelectedMealItemCount() === 0) {
      this.emptyDaysSelectedAlert('pin recipes');
      return;
    }

    const selectedItems = this.selectedDays.map(selectedDay => this.getItemsOnDay(selectedDay)).flat();

    const modal = await this.modalCtrl.create({
      component: MealPlanBulkPinModalPage,
      componentProps: {
        mealItems: selectedItems
      }
    });
    modal.present();
  }

  async bulkAddToShoppingList() {
    if (this.getSelectedMealItemCount() === 0) {
      this.emptyDaysSelectedAlert('pin recipes');
      return;
    }

    const selectedItems = this.selectedDays.map(selectedDay => this.getItemsOnDay(selectedDay)).flat();
    const selectedRecipes = selectedItems.map(item => item.recipe).filter(e => e);

    if (selectedRecipes.length === 0) {
      const noRecipesAlert = await this.alertCtrl.create({
        header: 'No Recipes',
        message: 'The selected days contain no recipes.\nKeep in mind that only meal items that are recipes can be added to the shopping list.\nYou cannot add manually entered meal items to the shopping list from here.',
        buttons: [{
          text: 'Ok',
        }]
      });
      await noRecipesAlert.present();
      return;
    }

    const modal = await this.modalCtrl.create({
      component: AddRecipeToShoppingListModalPage,
      componentProps: {
        recipes: selectedRecipes,
        scale: 1
      }
    });

    modal.present();
  }

  async dayClicked(day) {
    if (this.dayMoveInProgress || this.dayCopyInProgress) {
      const selectedDayList = this.selectedDaysInProgress.map(selectedDay => dayjs(selectedDay).format('MMM D')).join(', ');
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

    const updatedItems = this.selectedDaysInProgress.map(selectedDay =>
     this.getItemsOnDay(selectedDay).map(item => ({
       id: item.id,
       title: item.title,
       recipeId: item.recipeId || item.recipe?.id,
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

    const newItems = this.selectedDaysInProgress.map(selectedDay =>
     this.getItemsOnDay(selectedDay).map(item => ({
       title: item.title,
       recipeId: item.recipeId || item.recipe?.id,
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
