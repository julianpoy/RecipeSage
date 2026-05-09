import { Component, computed, inject } from "@angular/core";
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

  private meQuery = this.serverActionsService.users.getMe();
  me = this.meQuery.value;
  private shoppingListsQuery =
    this.serverActionsService.shoppingLists.getShoppingLists();
  shoppingLists = computed(() => {
    const lists = this.shoppingListsQuery.value();
    if (!lists) return lists;
    return [...lists].sort((a, b) => a.title.localeCompare(b.title));
  });

  constructor() {
    addIcons({ add, ban, cart, list, options });
  }

  ionViewWillEnter() {
    this.shoppingListsQuery.refresh();

    this.websocketService.on(
      "shoppinglist:updated",
      this.shoppingListsQuery.refresh,
    );
  }

  ionViewWillLeave() {
    this.websocketService.off(
      "shoppinglist:updated",
      this.shoppingListsQuery.refresh,
    );
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

  formatItemCreationDate(date: string | number | Date) {
    return this.utilService.formatDate(date, { now: true });
  }
}
