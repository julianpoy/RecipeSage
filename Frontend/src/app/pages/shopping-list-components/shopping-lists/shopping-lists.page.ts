import { Component } from '@angular/core';
import { NavController, ModalController, ToastController } from '@ionic/angular';
import { ShoppingListService } from '@/services/shopping-list.service';
import { WebsocketService } from '@/services/websocket.service';
import { LoadingService } from '@/services/loading.service';
import { UtilService, RouteMap, AuthType } from '@/services/util.service';

import { NewShoppingListModalPage } from '../new-shopping-list-modal/new-shopping-list-modal.page';

@Component({
  selector: 'page-shopping-lists',
  templateUrl: 'shopping-lists.page.html',
  styleUrls: ['shopping-lists.page.scss']
})
export class ShoppingListsPage {

  shoppingLists: any = [];

  initialLoadComplete = false;

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
    const loading = this.loadingService.start();

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
        this.shoppingLists = response.sort((a, b) => {
          return a.title.localeCompare(b.title);
        });

        resolve();
      }).catch(async err => {
        reject();

        switch (err.response.status) {
          case 0:
            const offlineToast = await this.toastCtrl.create({
              message: this.utilService.standardMessages.offlineFetchMessage,
              duration: 5000
            });
            offlineToast.present();
            break;
          case 401:
            this.navCtrl.navigateRoot(RouteMap.AuthPage.getPath(AuthType.Login));
            break;
          default:
            const errorToast = await this.toastCtrl.create({
              message: this.utilService.standardMessages.unexpectedError,
              showCloseButton: true
            });
            errorToast.present();
            break;
        }
      });
    });
  }

  async newShoppingList() {
    const modal = await this.modalCtrl.create({
      component: NewShoppingListModalPage
    });
    modal.present();
  }

  openShoppingList(listId) {
    this.navCtrl.navigateForward(RouteMap.ShoppingListPage.getPath(listId));
  }

  formatItemCreationDate(plainTextDate) {
    return this.utilService.formatDate(plainTextDate, { now: true });
  }
}
