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

  itemsByRecipeId: any = {};
  recipeIds: any = [];

  viewOptions: any = {};

  initialLoadComplete: boolean = false;

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

  ionViewDidLoad() {}

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

  processIncomingList(list) {
    var me = this;

    me.list = list;
    this.applySort();

    var items = (me.list.items || []);

    me.recipeIds = [];
    me.itemsByRecipeId = {};

    for (var i = 0; i < items.length; i++) {
      // Recipe grouping
      if (!items[i].recipe) continue;

      var recipeId = items[i].recipe.id + items[i].created;

      if (me.recipeIds.indexOf(recipeId) === -1) me.recipeIds.push(recipeId);

      if (!me.itemsByRecipeId[recipeId]) me.itemsByRecipeId[recipeId] = [];
      me.itemsByRecipeId[recipeId].push(items[i]);
    }
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

  removeRecipe(recipeId) {
    this.removeItems(this.itemsByRecipeId[recipeId]);
  }

  removeItems(items) {
    var me = this;
    var loading = this.loadingService.start();

    var itemIds = items.map(function (el) {
      return el._id;
    });

    this.shoppingListService.remove({
      _id: this.list._id,
      items: itemIds
    }).subscribe(function (response) {
      loading.dismiss();

      me.processIncomingList(response);

      var toast = me.toastCtrl.create({
        message: 'Removed ' + items.length + ' item' + (items.length > 1 ? 's' : ''),
        duration: 5000,
        showCloseButton: true,
        closeButtonText: 'Undo',
      });
      toast.onDidDismiss((data, role) => {
        if (role == "close") {
          me._addItems(items);
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
      showRecipeTitle: true,
      groupSimilar: true
    }

    this.viewOptions.sortBy = localStorage.getItem('shoppingList.sortBy');
    this.viewOptions.showAddedBy = JSON.parse(localStorage.getItem('shoppingList.showAddedBy'));
    this.viewOptions.showAddedOn = JSON.parse(localStorage.getItem('shoppingList.showAddedOn'));
    this.viewOptions.showRecipeTitle = JSON.parse(localStorage.getItem('shoppingList.showRecipeTitle'));
    this.viewOptions.groupSimilar = JSON.parse(localStorage.getItem('shoppingList.groupSimilar'));

    for (var key in this.viewOptions) {
      if (this.viewOptions.hasOwnProperty(key)) {
        if (this.viewOptions[key] == null) {
          this.viewOptions[key] = defaults[key];
        }
      }
    }
  }

  ingredientSorter(a, b) {
    if (this.viewOptions.sortBy === 'created') {
      var dateComp = (<any>new Date(a.created)) - (<any>new Date(b.created));
      if (dateComp === 0) {
        return a.title.localeCompare(b.title);
      }
      return dateComp;
    }
    if (this.viewOptions.sortBy === '-created') {
      var reverseDateComp = (<any>new Date(b.created)) - (<any>new Date(a.created));
      if (reverseDateComp === 0) {
        return a.title.localeCompare(b.title);
      }
      return reverseDateComp;
    }
    if (this.viewOptions.sortBy === '-title') {
      var localeComp = a.title.localeCompare(b.title);
      if (localeComp === 0) {
        return (<any>new Date(a.created)) - (<any>new Date(b.created));
      }
      return localeComp;
    }
  }

  applySort() {
    var me = this;
    // Sort individual items
    this.list.items = this.list.items.sort(function (a, b) {
      return me.ingredientSorter.call(me, a, b);
    });

    // Sort groups by title (always)
    this.list.itemsByGroup = this.list.itemsByGroup.sort(function (a, b) {
      return a.title.localeCompare(b.title);
    });

    // Sort items within each group
    for (var i = 0; i < this.list.itemsByGroup.length; i++) {
      this.list.itemsByGroup[i].items = this.list.itemsByGroup[i].items.sort(function(a, b) {
        return me.ingredientSorter.call(me, a, b);
      });
    }
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
