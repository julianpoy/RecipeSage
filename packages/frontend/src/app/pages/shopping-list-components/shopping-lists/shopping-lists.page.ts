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
import type { ShoppingListSummary, UserPublic } from "@recipesage/prisma";
import { TRPCService } from "../../../services/trpc.service";

@Component({
  selector: "page-shopping-lists",
  templateUrl: "shopping-lists.page.html",
  styleUrls: ["shopping-lists.page.scss"],
})
export class ShoppingListsPage {
  me?: UserPublic;
  shoppingLists: ShoppingListSummary[] = [];

  initialLoadComplete = false;

  constructor(
    private navCtrl: NavController,
    private modalCtrl: ModalController,
    private trpcService: TRPCService,
    private websocketService: WebsocketService,
    private loadingService: LoadingService,
    private utilService: UtilService,
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

    await Promise.all([this.loadLists(), this.loadMe()]);

    loading.dismiss();
    this.initialLoadComplete = true;
  }

  async refresh(refresher: any) {
    await this.loadLists();
    refresher.target.complete();
  }

  async loadLists() {
    const shoppingLists = await this.trpcService.handle(
      this.trpcService.trpc.shoppingLists.getShoppingLists.query(),
    );
    if (!shoppingLists) return;

    this.shoppingLists = shoppingLists.sort((a, b) => {
      return a.title.localeCompare(b.title);
    });
  }

  async loadMe() {
    const me = await this.trpcService.handle(
      this.trpcService.trpc.users.getMe.query(),
    );
    if (!me) return;

    this.me = me;
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

  formatItemCreationDate(date: Date | string) {
    return this.utilService.formatDate(date, { now: true });
  }
}
