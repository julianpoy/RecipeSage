import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ToastController, ModalController } from 'ionic-angular';
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

  lastItemRemoved: any;

  constructor(
    public navCtrl: NavController,
    public loadingService: LoadingServiceProvider,
    public shoppingListService: ShoppingListServiceProvider,
    public websocketService: WebsocketServiceProvider,
    public toastCtrl: ToastController,
    public modalCtrl: ModalController,
    public navParams: NavParams) {

    this.shoppingListId = navParams.get('shoppingListId');

    this.websocketService.register('shoppingList:itemsUpdated', function(payload) {
      if (payload.shoppingListId === this.shoppingListId) {
        this.loadList();
      }
    }, this);
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
    for (var i = 0; i < items.length; i++) {
      if (!items[i].recipe) continue;

      var recipeId = items[i].recipe.id;

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
              message: 'Recipe not found. Does this recipe URL exist?',
              duration: 30000,
              dismissOnPageChange: true
            });
            errorToast.present();
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
}
