import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ToastController, ModalController, PopoverController, AlertController } from 'ionic-angular';
import { LoadingServiceProvider } from '../../../providers/loading-service/loading-service';
import { MealPlanServiceProvider } from '../../../providers/meal-plan-service/meal-plan-service';
import { WebsocketServiceProvider } from '../../../providers/websocket-service/websocket-service';
import { UtilServiceProvider } from '../../../providers/util-service/util-service';
import { RecipeServiceProvider } from '../../../providers/recipe-service/recipe-service';

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
  today: any = new Date();
  center: any = new Date(this.today);
  selectedDay: any = this.today.getDate();

  constructor(
    public navCtrl: NavController,
    public loadingService: LoadingServiceProvider,
    public mealPlanService: MealPlanServiceProvider,
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
      if (payload.mealPlanId === this.mealPlanId) {
        this.loadList();
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
    this.loadList().then(function () {
      loading.dismiss();
      me.initialLoadComplete = true;
    }, function () {
      loading.dismiss();
      me.initialLoadComplete = true;
    });
  }

  refresh(loader) {
    this.loadList().then(function () {
      loader.complete();
    }, function () {
      loader.complete();
    });
  }

  selectDay(day) {
    if (day === 0) {
      this.moveCalendar(-1);
    } else if (day === 32) {
      this.moveCalendar(1);
    }

    this.selectedDay = day;
  }

  getFirstDayOfMonth(center) {
    return (new Date(center.getFullYear(), center.getMonth(), 1));
  }

  getLastDayOfMonth(center) {
    return (new Date(center.getFullYear(), center.getMonth() + 1, 0));
  }

  // Generates calendar array centered around specified day (today).
  generateCalendar(today?) {
    this.weeksOfMonth = [];

    var baseDate = today ? new Date(today) : new Date();
    var startOfMonth = this.getFirstDayOfMonth(baseDate);
    var endOfMonth = this.getLastDayOfMonth(baseDate);

    for (var dayOfMonth = 0; dayOfMonth < endOfMonth.getDate();) {
      var week = [];

      if (dayOfMonth === 0) {
        var startDay = startOfMonth.getDay();
        for (let i = 0; i < startDay; i++) week.push(0);
      }

      while (week.length < 7 && dayOfMonth < endOfMonth.getDate()) {
        week.push(dayOfMonth + 1);

        dayOfMonth++;
      }

      for (let i = week.length; i < 7; i++) week.push(32);

      this.weeksOfMonth.push(week);
    }

    this.selectDay(this.center.getDate());
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
      this.generateCalendar(this.center);
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
      item.scheduledDateObj = new Date(item.scheduledDate);
      var month = item.scheduledDateObj.getMonth();
      var day = item.scheduledDateObj.getDate();
      this.mealsByDate[month] = this.mealsByDate[month] || {};
      this.mealsByDate[month][day] = this.mealsByDate[month][day] || [];
      this.mealsByDate[month][day].push(item);
    });

    this.selectDay(this.selectedDay);
  }

  mealItemsByDay(day) {
    return (this.mealsByDate[this.center.getMonth()] || {})[day] || [];
  }

  loadList() {
    var me = this;

    return new Promise(function (resolve, reject) {
      me.mealPlanService.fetchById(me.mealPlanId).subscribe(function (response) {
        console.log(response);
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
      _id: this.mealPlanId,
      itemId: item._id
    }).subscribe(function (response) {
      loading.dismiss();

      me.processIncomingMealPlan(response);
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

    var date = new Date(this.center);
    date.setDate(this.selectedDay);

    this.mealPlanService.addItem({
      _id: this.mealPlanId,
      title: item.title,
      recipe: item.recipe || null,
      meal: item.meal,
      scheduledDate: date
    }).subscribe(function (response) {
      loading.dismiss();

      me.processIncomingMealPlan(response);
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
      sortBy: '-created',
      showAddedBy: false,
      showAddedOn: false,
      showRecipeTitle: true,
      groupSimilar: true
    }

    this.viewOptions.sortBy = localStorage.getItem('mealPlan.sortBy');
    this.viewOptions.showAddedBy = JSON.parse(localStorage.getItem('mealPlan.showAddedBy'));
    this.viewOptions.showAddedOn = JSON.parse(localStorage.getItem('mealPlan.showAddedOn'));
    this.viewOptions.showRecipeTitle = JSON.parse(localStorage.getItem('mealPlan.showRecipeTitle'));
    this.viewOptions.groupSimilar = JSON.parse(localStorage.getItem('mealPlan.groupSimilar'));

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
      recipeId: recipe._id
    });
  }

  addRecipeToShoppingList(recipe) {
    var me = this;
    // Fetch complete recipe (this page is provided with only topical recipe details)
    this.recipeService.fetchById(recipe._id).subscribe(function (response) {
      let addRecipeToShoppingListModal = me.modalCtrl.create('AddRecipeToShoppingListModalPage', {
        recipe: response
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

  // ingredientSorter(a, b) {
  //   if (this.viewOptions.sortBy === 'created') {
  //     var dateComp = (<any>new Date(a.created)) - (<any>new Date(b.created));
  //     if (dateComp === 0) {
  //       return a.title.localeCompare(b.title);
  //     }
  //     return dateComp;
  //   }
  //   if (this.viewOptions.sortBy === '-created') {
  //     var reverseDateComp = (<any>new Date(b.created)) - (<any>new Date(a.created));
  //     if (reverseDateComp === 0) {
  //       return a.title.localeCompare(b.title);
  //     }
  //     return reverseDateComp;
  //   }
  //   if (this.viewOptions.sortBy === '-title') {
  //     var localeComp = a.title.localeCompare(b.title);
  //     if (localeComp === 0) {
  //       return (<any>new Date(a.created)) - (<any>new Date(b.created));
  //     }
  //     return localeComp;
  //   }
  // }

  // applySort() {
  //   var me = this;
  //   // Sort individual items
  //   this.list.items = this.list.items.sort(function (a, b) {
  //     return me.ingredientSorter.call(me, a, b);
  //   });

  //   // Sort groups by title (always)
  //   this.list.itemsByGroup = this.list.itemsByGroup.sort(function (a, b) {
  //     return a.title.localeCompare(b.title);
  //   });

  //   // Sort items within each group
  //   for (var i = 0; i < this.list.itemsByGroup.length; i++) {
  //     this.list.itemsByGroup[i].items = this.list.itemsByGroup[i].items.sort(function (a, b) {
  //       return me.ingredientSorter.call(me, a, b);
  //     });
  //   }
  // }

  // presentPopover(event) {
  //   let popover = this.popoverCtrl.create('ShoppingListPopoverPage', {
  //     mealPlanId: this.mealPlanId,
  //     mealPlan: this.list,
  //     viewOptions: this.viewOptions
  //   });

  //   popover.present({
  //     ev: event
  //   });

  //   var me = this;
  //   popover.onDidDismiss(data => {
  //     data = data || {};

  //     if (!data.destination) {
  //       me.applySort();
  //       return;
  //     }

  //     if (data.setRoot) {
  //       me.navCtrl.setRoot(data.destination, data.routingData || {}, { animate: true, direction: 'forward' });
  //     } else {
  //       me.navCtrl.push(data.destination, data.routingData);
  //     }
  //   });
  // }

  prettyMonthName(date) {
    return date.toLocaleString(this.utilService.lang, { month: 'long' });
  }
}
