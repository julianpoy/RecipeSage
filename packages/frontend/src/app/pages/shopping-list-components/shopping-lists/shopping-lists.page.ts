import { Component, inject } from "@angular/core";
import {
  NavController,
  ModalController,
  ToastController,
} from "@ionic/angular/standalone";
import { WebsocketService } from "~/services/websocket.service";
import { LoadingService } from "~/services/loading.service";
import { UtilService, RouteMap } from "~/services/util.service";

import { NewShoppingListModalPage } from "../new-shopping-list-modal/new-shopping-list-modal.page";
import { ShoppingListIgnoreModalPage } from "../shopping-list-ignore-modal/shopping-list-ignore-modal.page";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { NullStateComponent } from "../../../components/null-state/null-state.component";
import type { ShoppingListSummary, UserPublic } from "@recipesage/prisma";
import { ServerActionsService } from "../../../services/server-actions.service";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonButton,
  IonIcon,
  IonContent,
  IonPopover,
  IonListHeader,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonFab,
  IonFabButton,
  IonSpinner,
} from "@ionic/angular/standalone";
import { add, ban, cart, list, options } from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "page-shopping-lists",
  templateUrl: "shopping-lists.page.html",
  styleUrls: ["shopping-lists.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    NullStateComponent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonButton,
    IonIcon,
    IonContent,
    IonPopover,
    IonListHeader,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonFab,
    IonFabButton,
    IonSpinner,
  ],
})
export class ShoppingListsPage {
  navCtrl = inject(NavController);
  modalCtrl = inject(ModalController);
  toastCtrl = inject(ToastController);
  serverActionsService = inject(ServerActionsService);
  websocketService = inject(WebsocketService);
  loadingService = inject(LoadingService);
  utilService = inject(UtilService);

  me?: UserPublic;
  shoppingLists?: ShoppingListSummary[] = [];

  constructor() {
    addIcons({ add, ban, cart, list, options });
  }

  ionViewWillEnter() {
    const loading = this.loadingService.start();

    this.shoppingLists = undefined;

    Promise.all([this.loadLists(), this.loadMe()]).finally(() => {
      loading.dismiss();
    });

    this.websocketService.on("shoppinglist:updated", this.loadLists);
  }

  ionViewWillLeave() {
    this.websocketService.off("shoppinglist:updated", this.loadLists);
  }

  async loadMe() {
    const me = await this.serverActionsService.users.getMe();
    if (!me) return;

    this.me = me;
  }

  loadLists = async () => {
    const response =
      await this.serverActionsService.shoppingLists.getShoppingLists();
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
