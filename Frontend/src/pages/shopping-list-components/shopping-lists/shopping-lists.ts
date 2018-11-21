import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ModalController, ToastController } from 'ionic-angular';
import { ShoppingListServiceProvider } from '../../../providers/shopping-list-service/shopping-list-service';
import { WebsocketServiceProvider } from '../../../providers/websocket-service/websocket-service';
import { LoadingServiceProvider } from '../../../providers/loading-service/loading-service';
import { UtilServiceProvider } from '../../../providers/util-service/util-service';

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
    public utilService: UtilServiceProvider,
    public navParams: NavParams) {

    this.websocketService.register('shoppingList:received', () => {
      this.loadLists();
    }, this);

    this.websocketService.register('shoppingList:removed', () => {
      this.loadLists();
    }, this);
  }

  ionViewDidLoad() {}

  ionViewWillEnter() {
    var loading = this.loadingService.start();

    this.initialLoadComplete = false;

    this.loadLists().then(() => {
      loading.dismiss();
      this.initialLoadComplete = true;
    }, () => {
      loading.dismiss();
      this.initialLoadComplete = true;
    });
  }

  refresh(refresher) {
    this.loadLists().then(() => {
      refresher.complete();
    }, () => {
      refresher.complete();
    });
  }

  loadLists() {
    return new Promise((resolve, reject) => {
      this.shoppingListService.fetch().subscribe(response => {
        this.shoppingLists = response;

        resolve();
      }, err => {
        reject();

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
          default:
            let errorToast = this.toastCtrl.create({
              message: this.utilService.standardMessages.unexpectedError,
              duration: 30000
            });
            errorToast.present();
            break;
        }
      });
    });
  }

  newShoppingList() {
    let modal = this.modalCtrl.create('NewShoppingListModalPage');
    modal.present();
    modal.onDidDismiss(data => {
      if (!data || !data.destination) return;

      if (data.setRoot) {
        this.navCtrl.setRoot(data.destination, data.routingData || {}, { animate: true, direction: 'forward' });
      } else {
        this.navCtrl.push(data.destination, data.routingData);
      }
    });
  }
  openShoppingList(listId) {
    // this.navCtrl.setRoot(RecipePage, {}, {animate: true, direction: 'forward'});
    this.navCtrl.push('ShoppingListPage', {
      shoppingListId: listId
    });
  }

  formatItemCreationDate(plainTextDate) {
    return this.utilService.formatDate(plainTextDate, { now: true });
  }
}
