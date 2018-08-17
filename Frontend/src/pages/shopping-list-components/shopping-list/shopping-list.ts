import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ToastController, ModalController, PopoverController } from 'ionic-angular';
import { LoadingServiceProvider } from '../../../providers/loading-service/loading-service';
import { ShoppingListServiceProvider } from '../../../providers/shopping-list-service/shopping-list-service';
import { WebsocketServiceProvider } from '../../../providers/websocket-service/websocket-service';

@IonicPage({
  segment: 'shopping-lists/:shoppingListId',
  priority: 'low'
})
@Component({
  selector: 'page-shopping-list',
  templateUrl: 'shopping-list.html',
})
export class ShoppingListPage {

  shoppingListId: string;
  list: any = { items: [], collaborators: [] };
  groups: any = [];

  itemsByRecipeId: any = {};
  recipeIds: any = [];

  lastItemRemoved: any;

  viewOptions: any = {};

  constructor(
    public navCtrl: NavController,
    public loadingService: LoadingServiceProvider,
    public shoppingListService: ShoppingListServiceProvider,
    public websocketService: WebsocketServiceProvider,
    public toastCtrl: ToastController,
    public modalCtrl: ModalController,
    public popoverCtrl: PopoverController,
    public navParams: NavParams) {

    this.shoppingListId = navParams.get('shoppingListId');

    this.websocketService.register('shoppingList:itemsUpdated', function(payload) {
      if (payload.shoppingListId === this.shoppingListId) {
        this.loadList();
      }
    }, this);

    this.loadViewOptions();
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad ShoppingListPage');
  }

  ionViewWillEnter() {
    var loading = this.loadingService.start();

    this.loadList().then(function () {
      loading.dismiss();
    }, function () {
      loading.dismiss();
    });
  }

  refresh(loader) {
    this.loadList().then(function () {
      loader.complete();
    }, function () {
      loader.complete();
    });
  }

  processIncomingList(list) {
    var me = this;

    me.list = list;

    var items = (me.list.items || []);

    me.recipeIds = [];
    me.itemsByRecipeId = {};
    me.groups = [];

    var ingredientGrouper = {};
    for (var i = 0; i < items.length; i++) {
      // Ingredient grouping
      var foundIngredientGroup = this.shoppingListService.ingredientsList.some(ingredient => {
        if (items[i].title.toLowerCase().indexOf(ingredient.toLowerCase()) > -1) {
          ingredientGrouper[ingredient] = ingredientGrouper[ingredient] || [];
          ingredientGrouper[ingredient].push(items[i]);
          return true;
        }

        return false;
      });

      if (!foundIngredientGroup) {
        ingredientGrouper['Unsorted'] = ingredientGrouper['Unsorted'] || [];
        ingredientGrouper['Unsorted'].push(items[i]);
      }

      // Recipe grouping
      if (!items[i].recipe) continue;

      var recipeId = items[i].recipe.id;

      if (me.recipeIds.indexOf(recipeId) === -1) me.recipeIds.push(recipeId);

      if (!me.itemsByRecipeId[recipeId]) me.itemsByRecipeId[recipeId] = [];
      me.itemsByRecipeId[recipeId].push(items[i]);
    }

    console.log(ingredientGrouper)

    for (var key in ingredientGrouper) {
      if (ingredientGrouper.hasOwnProperty(key)) {
        this.groups.push({
          title: key,
          items: ingredientGrouper[key],
          completed: false
        });
      }
    }

    this.applySort();
  }

  loadList() {
    var me = this;

    return new Promise(function (resolve, reject) {
      me.shoppingListService.fetchById(me.shoppingListId).subscribe(function (response) {
        me.processIncomingList(response);

        resolve();
      }, function (err) {
        switch (err.status) {
          case 0:
            let offlineToast = me.toastCtrl.create({
              message: 'It looks like you\'re offline. While offline, we\'re only able to fetch data you\'ve previously accessed on this device.',
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
              message: 'An unexpected error occured. Please restart application.',
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
    var me = this;
    var loading = this.loadingService.start();

    this.lastItemRemoved = item;

    this.shoppingListService.remove({
      _id: this.list._id,
      items: [ item._id ]
    }).subscribe(function (response) {
      loading.dismiss();

      me.processIncomingList(response);

      var toast = me.toastCtrl.create({
        message: 'Removed: ' + item.title,
        duration: 5000,
        showCloseButton: true,
        closeButtonText: 'Undo',
      });
      toast.onDidDismiss((data, role) => {
        if (role == "close") {
          // me.undoRemove();
          me._addItems([ item ]);
        }
      });
      toast.present();
    }, function (err) {
      loading.dismiss();
      switch (err.status) {
        case 0:
          me.toastCtrl.create({
            message: 'It looks like you\'re offline. While offline, all RecipeSage functions are read-only.',
            duration: 5000
          }).present();
          break;
        case 401:
          me.toastCtrl.create({
            message: 'You are not authorized for this action! If you believe this is in error, please log out and log in using the side menu.',
            duration: 6000
          }).present();
          break;
        default:
          me.toastCtrl.create({
            message: 'An unexpected error occured. Please try again.',
            duration: 6000
          }).present();
          break;
      }
    });
  }

  undoRemove() {
    if (!this.lastItemRemoved) return;

    this._addItems([this.lastItemRemoved]);
  }

  _addItems(items) {
    var me = this;
    var loading = this.loadingService.start();

    this.shoppingListService.addItems({
      _id: this.list._id,
      items: items
    }).subscribe(function (response) {
      loading.dismiss();

      me.processIncomingList(response);
    }, function (err) {
      loading.dismiss();
      switch (err.status) {
        case 0:
          me.toastCtrl.create({
            message: 'It looks like you\'re offline. While offline, all RecipeSage functions are read-only.',
            duration: 5000
          }).present();
          break;
        case 401:
          me.toastCtrl.create({
            message: 'You are not authorized for this action! If you believe this is in error, please log out and log in using the side menu.',
            duration: 6000
          }).present();
          break;
        default:
          me.toastCtrl.create({
            message: 'An unexpected error occured. Please try again.',
            duration: 6000
          }).present();
          break;
      }
    });
  }

  newShoppingListItem() {
    var me = this;
    let modal = this.modalCtrl.create('NewShoppingListItemModalPage');
    modal.present();
    modal.onDidDismiss(data => {
      if (data.items) {
        this._addItems(data.items);
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
    var todayAfter = new Date();
    todayAfter.setHours(0);
    todayAfter.setMinutes(0);
    todayAfter.setSeconds(0);
    todayAfter.setMilliseconds(0);

    var plainTextAfter = new Date();
    plainTextAfter.setDate(plainTextAfter.getDate() - 7);

    var toFormat = new Date(plainTextDate);

    if (todayAfter < toFormat) {
      return 'today';
    }

    if (plainTextAfter < toFormat) {
      var dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return dayNames[toFormat.getDay()];
    }

    return toFormat.toLocaleString((<any>window.navigator).userLanguage || window.navigator.language, {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    });
  }

  loadViewOptions() {
    var defaults = {
      sortBy: '-created',
      showAddedBy: false,
      showAddedOn: false,
      showRecipeTitle: true
    }

    this.viewOptions.sortBy = localStorage.getItem('shoppingLists.sortBy');
    this.viewOptions.showAddedBy = JSON.parse(localStorage.getItem('shoppingLists.showAddedBy'));
    this.viewOptions.showAddedOn = JSON.parse(localStorage.getItem('shoppingLists.showAddedOn'));
    this.viewOptions.showRecipeTitle = JSON.parse(localStorage.getItem('shoppingLists.showRecipeTitle'));

    for (var key in this.viewOptions) {
      if (this.viewOptions.hasOwnProperty(key)) {
        if (this.viewOptions[key] == null) {
          this.viewOptions[key] = defaults[key];
        }
      }
    }
  }

  applySort() {
    var me = this;
    this.list.items = this.list.items.sort(function(a, b) {
      if (me.viewOptions.sortBy === 'created') {
        return new Date(a.created) > new Date(b.created);
      }
      if (me.viewOptions.sortBy === '-created') {
        return new Date(a.created) < new Date(b.created);
      }
      if (me.viewOptions.sortBy === '-title') {
        return a.title.localeCompare(b.title);
      }
    });
  }

  presentPopover(event) {
    let popover = this.popoverCtrl.create('ShoppingListPopoverPage', {
      shoppingListId: this.shoppingListId,
      shoppingList: this.list,
      viewOptions: this.viewOptions
    });

    popover.present({
      ev: event
    });

    var me = this;
    popover.onDidDismiss(data => {
      data = data || {};

      if (!data.destination) {
        me.applySort();
        return;
      }

      if (data.setRoot) {
        me.navCtrl.setRoot(data.destination, data.routingData || {}, { animate: true, direction: 'forward' });
      } else {
        me.navCtrl.push(data.destination, data.routingData);
      }
    });
  }
}
