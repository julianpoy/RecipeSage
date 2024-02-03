import { Component } from "@angular/core";
import {
  NavController,
  ModalController,
  ToastController,
} from "@ionic/angular";
import { ShoppingListService } from "~/services/shopping-list.service";
import { WebsocketService } from "~/services/websocket.service";
import { LoadingService } from "~/services/loading.service";
import { UtilService, RouteMap } from "~/services/util.service";

import { NewShoppingListModalPage } from "../new-shopping-list-modal/new-shopping-list-modal.page";
import { ShoppingListIgnoreModalPage } from "../shopping-list-ignore-modal/shopping-list-ignore-modal.page";

@Component({
  selector: "page-shopping-lists",
  templateUrl: "shopping-lists.page.html",
  styleUrls: ["shopping-lists.page.scss"],
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
    public utilService: UtilService,
  ) {
    this.websocketService.register(
      "shoppingList:received",
      () => {
        this.loadLists();
      },
      this,
    );

    this.websocketService.register(
      "shoppingList:removed",
      () => {
        this.loadLists();
      },
      this,
    );
  }

  async ionViewWillEnter() {
    const loading = this.loadingService.start();
    this.initialLoadComplete = false;

    await this.loadLists();

    loading.dismiss();
    this.initialLoadComplete = true;
  }

  async refresh(refresher: any) {
    await this.loadLists();
    refresher.target.complete();
  }

  async loadLists() {
    const response = await this.shoppingListService.fetch();
    if (!response.success) return;

    this.shoppingLists = response.data.sort((a, b) => {
      return a.title.localeCompare(b.title);
    });
  }

  async newShoppingList() {
    const modal = await this.modalCtrl.create({
      component: NewShoppingListModalPage,
    });
    modal.present();
  }

  async showIgnoreModal() {
    const modal = await this.modalCtrl.create({
      component: ShoppingListIgnoreModalPage,
    });
    modal.present();
  }

  openShoppingList(listId: string) {
    this.navCtrl.navigateForward(RouteMap.ShoppingListPage.getPath(listId));
  }

  formatItemCreationDate(plainTextDate: string) {
    return this.utilService.formatDate(plainTextDate, { now: true });
  }
}
