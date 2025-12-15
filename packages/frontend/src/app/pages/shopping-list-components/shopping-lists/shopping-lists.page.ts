import { Component, inject } from "@angular/core";
import {
  NavController,
  ModalController,
  ToastController,
} from "@ionic/angular";
import { WebsocketService } from "~/services/websocket.service";
import { LoadingService } from "~/services/loading.service";
import { UtilService, RouteMap } from "~/services/util.service";

import { NewShoppingListModalPage } from "../new-shopping-list-modal/new-shopping-list-modal.page";
import { ShoppingListIgnoreModalPage } from "../shopping-list-ignore-modal/shopping-list-ignore-modal.page";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { NullStateComponent } from "../../../components/null-state/null-state.component";
import { ShoppingListSummary, UserPublic } from "@recipesage/prisma";
import { TRPCService } from "../../../services/trpc.service";

@Component({
  selector: "page-shopping-lists",
  templateUrl: "shopping-lists.page.html",
  styleUrls: ["shopping-lists.page.scss"],
  imports: [...SHARED_UI_IMPORTS, NullStateComponent],
})
export class ShoppingListsPage {
  navCtrl = inject(NavController);
  modalCtrl = inject(ModalController);
  toastCtrl = inject(ToastController);
  trpcService = inject(TRPCService);
  websocketService = inject(WebsocketService);
  loadingService = inject(LoadingService);
  utilService = inject(UtilService);

  me?: UserPublic;
  shoppingLists?: ShoppingListSummary[] = [];

  constructor() {}

  ionViewWillEnter() {
    const loading = this.loadingService.start();

    Promise.all([this.loadLists(), this.loadMe()]).finally(() => {
      loading.dismiss();
    });

    this.websocketService.on("shoppingList:received", this.loadLists);
    this.websocketService.on("shoppingList:removed", this.loadLists);
  }

  ionViewWillLeave() {
    this.websocketService.off("shoppingList:received", this.loadLists);
    this.websocketService.off("shoppingList:removed", this.loadLists);
  }

  async refresh(refresher: any) {
    await this.loadLists();
    refresher.target.complete();
  }

  async loadMe() {
    const me = await this.trpcService.handle(
      this.trpcService.trpc.users.getMe.query(),
    );
    if (!me) return;

    this.me = me;
  }

  loadLists = async () => {
    const response = await this.trpcService.handle(
      this.trpcService.trpc.shoppingLists.getShoppingLists.query(),
    );
    if (!response) return;

    this.shoppingLists = response.sort((a, b) => {
      return a.title.localeCompare(b.title);
    });
  };

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

  formatItemCreationDate(date: string | number | Date) {
    return this.utilService.formatDate(date, { now: true });
  }
}
