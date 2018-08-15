import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ModalController, ToastController } from 'ionic-angular';
import { ShoppingListServiceProvider } from '../../../providers/shopping-list-service/shopping-list-service';
import { WebsocketServiceProvider } from '../../../providers/websocket-service/websocket-service';

@IonicPage({
  segment: 'shopping-lists',
  priority: 'low'
})
@Component({
  selector: 'page-shopping-lists',
  templateUrl: 'shopping-lists.html',
})
export class ShoppingListsPage {

  shoppingLists: any = [];

  constructor(
    public navCtrl: NavController,
    public modalCtrl: ModalController,
    public toastCtrl: ToastController,
    public shoppingListService: ShoppingListServiceProvider,
    public websocketService: WebsocketServiceProvider,
    public navParams: NavParams) {

    this.websocketService.register('shoppingList:received', function() {
      this.loadLists();
    }, this);

    this.websocketService.register('shoppingList:removed', function () {
      this.loadLists();
    }, this);
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad ShoppingListsPage');
  }

  ionViewWillEnter() {
    this.loadLists().then(function () { }, function () { });
  }

  refresh(refresher) {
    this.loadLists().then(function () {
      refresher.complete();
    }, function () {
      refresher.complete();
    });
  }

  loadLists() {
    var me = this;

    return new Promise(function (resolve, reject) {
      me.shoppingListService.fetch().subscribe(function (response) {
        me.shoppingLists = response;

        resolve();
      }, function (err) {
        reject();

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
          default:
            let errorToast = me.toastCtrl.create({
              message: 'An unexpected error occured. Please restart application.',
              duration: 30000
            });
            errorToast.present();
            break;
        }
      });
    });
  }

  newShoppingList() {
    var me = this;
    let modal = this.modalCtrl.create('NewShoppingListModalPage');
    modal.present();
    modal.onDidDismiss(data => {
      if (!data.destination) return;

      if (data.setRoot) {
        me.navCtrl.setRoot(data.destination, data.routingData || {}, { animate: true, direction: 'forward' });
      } else {
        me.navCtrl.push(data.destination, data.routingData);
      }
    });
  }
  openShoppingList(listId) {
    // me.navCtrl.setRoot(RecipePage, {}, {animate: true, direction: 'forward'});
    this.navCtrl.push('ShoppingListPage', {
      shoppingListId: listId
    });
  }
}
