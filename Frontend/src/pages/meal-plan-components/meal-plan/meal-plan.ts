import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ToastController, ModalController, PopoverController, AlertController } from 'ionic-angular';
import { LoadingServiceProvider } from '../../../providers/loading-service/loading-service';
import { MealPlanServiceProvider } from '../../../providers/meal-plan-service/meal-plan-service';
import { WebsocketServiceProvider } from '../../../providers/websocket-service/websocket-service';
import { UtilServiceProvider } from '../../../providers/util-service/util-service';
import { RecipeServiceProvider } from '../../../providers/recipe-service/recipe-service';
import { ShoppingListServiceProvider } from '../../../providers/shopping-list-service/shopping-list-service';

import dayjs, { Dayjs } from 'dayjs'

@IonicPage({
  segment: 'meal-planners/:mealPlanId',
  priority: 'low'
})
@Component({
  selector: 'page-meal-plan',
  templateUrl: 'meal-plan.html',
})
export class MealPlanPage {

  mealPlanId: string;
  mealPlan: any = { items: [], collaborators: [] };
  mealsByDate: any = {};

  itemsByRecipeId: any = {};
  recipeIds: any = [];

  viewOptions: any = {};

  initialLoadComplete: boolean = false;

  weeksOfMonth: any = [];
  today: Date = new Date();
  center: Date = new Date(this.today);
  selectedDay: Dayjs = dayjs(this.today);
  dayTitles: string[];

  reference: number = 0;

  constructor(
    public navCtrl: NavController,
    public loadingService: LoadingServiceProvider,
    public mealPlanService: MealPlanServiceProvider,
    public shoppingListService: ShoppingListServiceProvider,
    public recipeService: RecipeServiceProvider,
    public websocketService: WebsocketServiceProvider,
    public utilService: UtilServiceProvider,
    public toastCtrl: ToastController,
    public modalCtrl: ModalController,
    public popoverCtrl: PopoverController,
    public alertCtrl: AlertController,
    public navParams: NavParams) {

    this.mealPlanId = navParams.get('mealPlanId');

    this.websocketService.register('mealPlan:itemsUpdated', function (payload) {
      if (payload.mealPlanId === this.mealPlanId && payload.reference !== this.reference) {
        this.loadMealPlan();
      }
    }, this);

    this.loadViewOptions();

    this.generateCalendar();
  }

  ionViewDidLoad() { }

  ionViewWillEnter() {
    var loading = this.loadingService.start();
    var me = this;

    me.initialLoadComplete = false;
    this.loadMealPlan().then(function () {
      loading.dismiss();
      me.initialLoadComplete = true;
    }, function () {
      loading.dismiss();
      me.initialLoadComplete = true;
    });
  }

  refresh(loader) {
    this.loadMealPlan().then(function () {
      loader.complete();
    }, function () {
      loader.complete();
    });
  }

  // Generates calendar array centered around specified day (today).
  generateCalendar() {
    const { viewOptions, center } = this;

    this.weeksOfMonth = [];

    const base = dayjs(center);
    var startOfMonth = base.startOf('month');
    var startOfCalendar = startOfMonth.startOf('week');
    var endOfMonth = base.endOf('month');
    var endOfCalendar = endOfMonth.endOf('week');

    if (viewOptions.startOfWeek === 'monday') {
      this.dayTitles = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
      startOfCalendar = startOfCalendar.add(1, 'day');

      // Special case for months starting on sunday: Add an additional week before
      if (startOfMonth.day() === 0) {
        startOfCalendar = startOfMonth.subtract(1, 'week').add(1, 'day');
      }
    } else {
      this.dayTitles = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    }

    var iteratorDate = dayjs(startOfCalendar);

    while (iteratorDate.isBefore(endOfCalendar)) {
      let week = [];

      while (week.length < 7) {
        week.push(iteratorDate);
        iteratorDate = iteratorDate.add(1, 'day');
      }

      this.weeksOfMonth.push(week);
    }

    return [startOfCalendar, endOfCalendar];
  }

  // Gets new calendar center date. Positive = next month, negative = last month
  getNewCenter(direction) {
    var currentMonth = this.center.getMonth();
    var newMonth = direction > 0 ? currentMonth + 1 : currentMonth - 1;

    return new Date(this.center.getFullYear(), newMonth, 1);
  }

  // Checks if calendar can move in specified direction. Positive = next month, negative = last month
  canMoveCalendar(direction) {
    var newCenter = this.getNewCenter(direction);
    if (direction > 0) {
      let maximum = new Date(this.today.getFullYear() + 1, this.today.getMonth(), 0); // Can't see last month next year
      return newCenter < maximum;
    } else {
      var minimum = new Date(this.today.getFullYear(), this.today.getMonth(), 1); // Can't be less than the first day of this month
      return newCenter >= minimum;
    }
  }

  // Moves the calendar. Positive = next month, negative = last month
  moveCalendar(direction) {
    if (this.canMoveCalendar(direction)) {
      this.center = this.getNewCenter(direction);
      let bounds = this.generateCalendar();

      if (this.selectedDay.isBefore(bounds[0]) || this.selectedDay.isAfter(bounds[1])) {
        this.selectedDay = dayjs(this.center);
      }
    }
  }

  processIncomingMealPlan(mealPlan) {
    this.mealPlan = mealPlan;
    this.mealsByDate = {};

    var mealSortOrder = {
      'breakfast': 1,
      'lunch'    : 2,
      'dinner'   : 3,
      'snacks'   : 4,
      'other'    : 5
    };
    mealPlan.items.sort((a, b) => {
      let comp = (mealSortOrder[a.meal] || 6) - (mealSortOrder[b.meal] || 6);
      if (comp === 0) return a.title.localeCompare(b.title);
      return comp;
    }).forEach((item) => {
      item.scheduledDateObj = new Date(item.scheduled);
      var month = item.scheduledDateObj.getMonth();
      var day = item.scheduledDateObj.getDate();
      this.mealsByDate[month] = this.mealsByDate[month] || {};
      this.mealsByDate[month][day] = this.mealsByDate[month][day] || [];
      this.mealsByDate[month][day].push(item);
    });
  }

  mealItemsByDay(day) {
    return (this.mealsByDate[day.month()] || {})[day.date()] || [];
  }

  loadMealPlan() {
    var me = this;

    return new Promise(function (resolve, reject) {
      me.mealPlanService.fetchById(me.mealPlanId).subscribe(function (response) {
        me.processIncomingMealPlan(response);

        resolve();
      }, function (err) {
        switch (err.status) {
          case 0:
            let offlineToast = me.toastCtrl.create({
              message: me.utilService.standardMessages.offlineFetchMessage,
              duration: 5000
            });
            offlineToast.present();
            break;
          case 401:
            me.navCtrl.setRoot('LoginPage', {}, { animate: true, direction: 'forward' });
            break;
          case 404:
            let errorToast = me.toastCtrl.create({
              message: 'Shopping list not found. Does this shopping list URL exist?',
              duration: 30000,
              dismissOnPageChange: true
            });
            errorToast.present();

            me.navCtrl.setRoot('ShoppingListsPage', {}, { animate: true, direction: 'forward' });
            break;
          default:
            errorToast = me.toastCtrl.create({
              message: me.utilService.standardMessages.unexpectedError,
              duration: 30000
            });
            errorToast.present();
            break;
        }

        reject();
      });
    });
  }

  removeItem(item) {
    let alert = this.alertCtrl.create({
      title: 'Confirm Removal',
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
    var me = this;
    var loading = this.loadingService.start();

    this.mealPlanService.remove({
      id: this.mealPlanId,
      itemId: item.id
    }).subscribe(function (response) {
      me.reference = response.reference || 0;

      me.loadMealPlan().then(loading.dismiss);
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

  _addItem(item) {
    var me = this;
    var loading = this.loadingService.start();

    this.mealPlanService.addItem({
      id: this.mealPlanId,
      title: item.title,
      recipeId: item.recipeId || null,
      meal: item.meal,
      scheduled: this.selectedDay.toDate()
    }).subscribe(function (response) {
      me.reference = response.reference;

      me.loadMealPlan().then(loading.dismiss);
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

  newMealPlanItem() {
    var me = this;
    let modal = this.modalCtrl.create('NewMealPlanItemModalPage');
    modal.present();
    modal.onDidDismiss(data => {
      if (!data) return;
      if (data.item) {
        this._addItem(data.item);
      }

      if (!data.destination) return;

      if (data.setRoot) {
        me.navCtrl.setRoot(data.destination, data.routingData || {}, { animate: true, direction: 'forward' });
      } else {
        me.navCtrl.push(data.destination, data.routingData);
      }
    });
  }

  formatItemCreationDate(plainTextDate) {
    return this.utilService.formatDate(plainTextDate, { now: true });
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

  openRecipe(recipe) {
    this.navCtrl.push('RecipePage', {
      recipe: recipe,
      recipeId: recipe.id
    });
  }

  addMealPlanItemToShoppingList(mealPlanItem) {
    var me = this;
    // Fetch complete recipe (this page is provided with only topical recipe details)
    this.recipeService.fetchById(mealPlanItem.recipe.id).subscribe(function (response) {
      let addRecipeToShoppingListModal = me.modalCtrl.create('AddRecipeToShoppingListModalPage', {
        recipe: response,
        reference: mealPlanItem.id
      });
      addRecipeToShoppingListModal.present();
    }, function (err) {
      switch (err.status) {
        case 0:
          let offlineToast = me.toastCtrl.create({
            message: me.utilService.standardMessages.offlineFetchMessage,
            duration: 5000
          });
          offlineToast.present();
          break;
        case 401:
          me.navCtrl.setRoot('LoginPage', {}, { animate: true, direction: 'forward' });
          break;
        case 404:
          let errorToast = me.toastCtrl.create({
            message: 'Recipe not found. Does this recipe URL exist?',
            duration: 30000,
            dismissOnPageChange: true
          });
          errorToast.present();
          break;
        default:
          errorToast = me.toastCtrl.create({
            message: me.utilService.standardMessages.unexpectedError,
            duration: 30000
          });
          errorToast.present();
          break;
      }
    });
  }

  removeMealPlanItemFromShoppingList(mealPlanItem) {
    let alert = this.alertCtrl.create({
      title: 'Confirm Removal',
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
    var elIds = mealPlanItem.shoppingListItems.map(function(el) {
      return el.id;
    });

    var me = this;
    var loading = this.loadingService.start();

    this.shoppingListService.remove({
      id: mealPlanItem.shoppingListId,
      items: elIds
    }).subscribe(function (response) {
      loading.dismiss();

      delete mealPlanItem.shoppingListItems;
      delete mealPlanItem.shoppingListId;
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

  presentPopover(event) {
    let popover = this.popoverCtrl.create('MealPlanPopoverPage', {
      mealPlanId: this.mealPlanId,
      mealPlan: this.mealPlan,
      viewOptions: this.viewOptions
    });

    popover.present({
      ev: event
    });

    var me = this;
    popover.onDidDismiss(data => {
      data = data || {};

      if (!data.destination) {
        me.generateCalendar();
        return;
      }

      if (data.setRoot) {
        me.navCtrl.setRoot(data.destination, data.routingData || {}, { animate: true, direction: 'forward' });
      } else {
        me.navCtrl.push(data.destination, data.routingData);
      }
    });
  }

  prettyMonthName(date) {
    return date.toLocaleString(this.utilService.lang, { month: 'long' });
  }
}
