import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ModalController, ToastController } from 'ionic-angular';
import { ShoppingListServiceProvider } from '../../../providers/shopping-list-service/shopping-list-service';
import { WebsocketServiceProvider } from '../../../providers/websocket-service/websocket-service';
import { LoadingServiceProvider } from '../../../providers/loading-service/loading-service';

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

  initialLoadComplete: boolean = false;

  constructor(
    public navCtrl: NavController,
    public modalCtrl: ModalController,
    public toastCtrl: ToastController,
    public shoppingListService: ShoppingListServiceProvider,
    public websocketService: WebsocketServiceProvider,
    public loadingService: LoadingServiceProvider,
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
    var loading = this.loadingService.start();

    var me = this;
    me.initialLoadComplete = false;

    this.loadLists().then(function () {
      loading.dismiss();
      me.initialLoadComplete = true;
    }, function () {
      loading.dismiss();
      me.initialLoadComplete = true;
    });
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
}
