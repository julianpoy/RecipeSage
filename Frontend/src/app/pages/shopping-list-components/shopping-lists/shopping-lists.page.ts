import { Component } from '@angular/core';
import { NavController, ModalController, ToastController } from '@ionic/angular';
import { ShoppingListService } from '@/services/shopping-list.service';
import { WebsocketService } from '@/services/websocket.service';
import { LoadingService } from '@/services/loading.service';
import { UtilService } from '@/services/util.service';

@Component({
  selector: 'page-shopping-lists',
  templateUrl: 'shopping-lists.page.html',
  styleUrls: ['shopping-lists.page.scss']
})
export class ShoppingListsPage {

  shoppingLists: any = [];

  initialLoadComplete: boolean = false;

  constructor(
    public navCtrl: NavController,
    public modalCtrl: ModalController,
    public toastCtrl: ToastController,
    public shoppingListService: ShoppingListService,
    public websocketService: WebsocketService,
    public loadingService: LoadingService,
    public utilService: UtilService) {

    this.websocketService.register('shoppingList:received', () => {
      this.loadLists();
    }, this);

    this.websocketService.register('shoppingList:removed', () => {
      this.loadLists();
    }, this);
  }


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
      refresher.target.complete();
    }, () => {
      refresher.target.complete();
    });
  }

  loadLists() {
    return new Promise((resolve, reject) => {
      this.shoppingListService.fetch().then(response => {
        this.shoppingLists = response;

        resolve();
      }).catch(async err => {
        reject();

        switch (err.status) {
          case 0:
            let offlineToast = await this.toastCtrl.create({
              message: this.utilService.standardMessages.offlineFetchMessage,
              duration: 5000
            });
            offlineToast.present();
            break;
          case 401:
            // this.navCtrl.setRoot('LoginPage', {}, { animate: true, direction: 'forward' });
            break;
          default:
            let errorToast = await this.toastCtrl.create({
              message: this.utilService.standardMessages.unexpectedError,
              duration: 30000
            });
            errorToast.present();
            break;
        }
      });
    });
  }

  async newShoppingList() {
    let modal = await this.modalCtrl.create({
      component: 'NewShoppingListModalPage'
    });
    modal.onDidDismiss().then(({ data }) => {
      if (!data || !data.destination) return;

      if (data.setRoot) {
        // this.navCtrl.setRoot(data.destination, data.routingData || {}, { animate: true, direction: 'forward' });
      } else {
        // this.navCtrl.push(data.destination, data.routingData);
      }
    });
    modal.present();
  }
  openShoppingList(listId) {
    // // this.navCtrl.setRoot(RecipePage, {}, {animate: true, direction: 'forward'});
    // this.navCtrl.push('ShoppingListPage', {
    //   shoppingListId: listId
    // });
  }

  formatItemCreationDate(plainTextDate) {
    return this.utilService.formatDate(plainTextDate, { now: true });
  }
}
