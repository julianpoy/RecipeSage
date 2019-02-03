import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ToastController, ModalController, PopoverController } from 'ionic-angular';
import { LoadingServiceProvider } from '../../../providers/loading-service/loading-service';
import { ShoppingListServiceProvider } from '../../../providers/shopping-list-service/shopping-list-service';
import { WebsocketServiceProvider } from '../../../providers/websocket-service/websocket-service';
import { UtilServiceProvider } from '../../../providers/util-service/util-service';

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

  reference: number = 0;

  constructor(
    public navCtrl: NavController,
    public loadingService: LoadingServiceProvider,
    public shoppingListService: ShoppingListServiceProvider,
    public websocketService: WebsocketServiceProvider,
    public utilService: UtilServiceProvider,
    public toastCtrl: ToastController,
    public modalCtrl: ModalController,
    public popoverCtrl: PopoverController,
    public navParams: NavParams) {

    this.shoppingListId = navParams.get('shoppingListId');

    this.websocketService.register('shoppingList:itemsUpdated', payload => {
      if (payload.shoppingListId === this.shoppingListId && payload.reference !== this.reference) {
        this.loadList();
      }
    }, this);

    this.loadViewOptions();
  }

  ionViewDidLoad() {}

  ionViewWillEnter() {
    var loading = this.loadingService.start();

    this.initialLoadComplete = false;
    this.loadList().then(() => {
      loading.dismiss();
      this.initialLoadComplete = true;
    }, () => {
      loading.dismiss();
      this.initialLoadComplete = true;
    });
  }

  refresh(loader) {
    this.loadList().then(() => {
      loader.complete();
    }, () => {
      loader.complete();
    });
  }

  processIncomingList(list) {
    this.list = list;
    this.applySort();

    var items = (this.list.items || []);

    this.recipeIds = [];
    this.itemsByRecipeId = {};

    for (var i = 0; i < items.length; i++) {
      // Recipe grouping
      if (!items[i].recipe) continue;

      var recipeId = items[i].recipe.id + items[i].createdAt;

      if (this.recipeIds.indexOf(recipeId) === -1) this.recipeIds.push(recipeId);

      if (!this.itemsByRecipeId[recipeId]) this.itemsByRecipeId[recipeId] = [];
      this.itemsByRecipeId[recipeId].push(items[i]);
    }
  }

  loadList() {
    return new Promise((resolve, reject) => {
      this.shoppingListService.fetchById(this.shoppingListId).subscribe(response => {
        this.processIncomingList(response);

        resolve();
      }, err => {
        switch (err.status) {
          case 0:
            let offlineToast = this.toastCtrl.create({
              message: this.utilService.standardMessages.offlineFetchMessage,
              duration: 5000
            });
            offlineToast.present();
            break;
          case 401:
            this.navCtrl.setRoot('LoginPage', {}, { animate: true, direction: 'forward' });
            break;
          case 404:
            let errorToast = this.toastCtrl.create({
              message: 'Shopping list not found. Does this shopping list URL exist?',
              duration: 30000,
              dismissOnPageChange: true
            });
            errorToast.present();

            this.navCtrl.setRoot('ShoppingListsPage', {}, { animate: true, direction: 'forward' });
            break;
          default:
            errorToast = this.toastCtrl.create({
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

  removeRecipe(recipeId) {
    this.removeItems(this.itemsByRecipeId[recipeId]);
  }

  removeItems(items) {
    var loading = this.loadingService.start();

    var itemIds = items.map(el => {
      return el.id;
    });

    this.shoppingListService.remove({
      id: this.list.id,
      items: itemIds
    }).subscribe(response => {
      this.reference = response.reference || 0;

      this.loadList().then(() => {
        loading.dismiss();
        var toast = this.toastCtrl.create({
          message: 'Removed ' + items.length + ' item' + (items.length > 1 ? 's' : ''),
          duration: 5000,
          showCloseButton: true,
          closeButtonText: 'Undo',
        });
        toast.onDidDismiss((data, role) => {
          if (role == "close") {
            this._addItems(items.map(el => {
              return {
                title: el.title,
                id: el.shoppingListId,
                mealPlanItemId: (el.mealPlanItem || {}).id || null,
                recipeId: (el.recipe || {}).id || null
              }
            }));
          }
        });
        toast.present();
      });
    }, err => {
      loading.dismiss();
      switch (err.status) {
        case 0:
          this.toastCtrl.create({
            message: this.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          }).present();
          break;
        case 401:
          this.toastCtrl.create({
            message: this.utilService.standardMessages.unauthorized,
            duration: 6000
          }).present();
          break;
        default:
          this.toastCtrl.create({
            message: this.utilService.standardMessages.unexpectedError,
            duration: 6000
          }).present();
          break;
      }
    });
  }

  _addItems(items) {
    var loading = this.loadingService.start();

    this.shoppingListService.addItems({
      id: this.list.id,
      items: items
    }).subscribe(response => {
      this.reference = response.reference || 0;

      this.loadList().then(loading.dismiss);
    }, err => {
      loading.dismiss();
      switch (err.status) {
        case 0:
          this.toastCtrl.create({
            message: this.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          }).present();
          break;
        case 401:
          this.toastCtrl.create({
            message: this.utilService.standardMessages.unauthorized,
            duration: 6000
          }).present();
          break;
        default:
          this.toastCtrl.create({
            message: this.utilService.standardMessages.unexpectedError,
            duration: 6000
          }).present();
          break;
      }
    });
  }

  newShoppingListItem() {
    let modal = this.modalCtrl.create('NewShoppingListItemModalPage');
    modal.present();
    modal.onDidDismiss(data => {
      if (!data) return;
      if (data.items) {
        this._addItems(data.items);
      }

      if (!data.destination) return;

      if (data.setRoot) {
        this.navCtrl.setRoot(data.destination, data.routingData || {}, { animate: true, direction: 'forward' });
      } else {
        this.navCtrl.push(data.destination, data.routingData);
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
      groupSimilar: false
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
      var dateComp = (<any>new Date(a.createdAt)) - (<any>new Date(b.createdAt));
      if (dateComp === 0) {
        return a.title.localeCompare(b.title);
      }
      return dateComp;
    }
    if (this.viewOptions.sortBy === '-created') {
      var reverseDateComp = (<any>new Date(b.createdAt)) - (<any>new Date(a.createdAt));
      if (reverseDateComp === 0) {
        return a.title.localeCompare(b.title);
      }
      return reverseDateComp;
    }
    if (this.viewOptions.sortBy === '-title') {
      var localeComp = a.title.localeCompare(b.title);
      if (localeComp === 0) {
        return (<any>new Date(a.createdAt)) - (<any>new Date(b.createdAt));
      }
      return localeComp;
    }
  }

  applySort() {
    // Sort individual items
    this.list.items = this.list.items.sort((a, b) => {
      return this.ingredientSorter(a, b);
    });

    // Sort groups by title (always)
    this.list.itemsByGroup = this.list.itemsByGroup.sort((a, b) => {
      return a.title.localeCompare(b.title);
    });

    // Sort items within each group
    for (var i = 0; i < this.list.itemsByGroup.length; i++) {
      this.list.itemsByGroup[i].items = this.list.itemsByGroup[i].items.sort((a, b) => {
        return this.ingredientSorter(a, b);
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

    popover.onDidDismiss(data => {
      data = data || {};

      if (!data.destination) {
        this.applySort();
        return;
      }

      if (data.setRoot) {
        this.navCtrl.setRoot(data.destination, data.routingData || {}, { animate: true, direction: 'forward' });
      } else {
        this.navCtrl.push(data.destination, data.routingData);
      }
    });
  }
}
