import { Component } from "@angular/core";
import {
  ModalController,
  ToastController,
  NavController,
} from "@ionic/angular";

import { LoadingService } from "~/services/loading.service";
import { ShoppingListService } from "~/services/shopping-list.service";
import { MessagingService } from "~/services/messaging.service";
import { UserService } from "~/services/user.service";
import { UtilService, RouteMap, AuthType } from "~/services/util.service";

@Component({
  selector: "page-new-shopping-list-modal",
  templateUrl: "new-shopping-list-modal.page.html",
  styleUrls: ["new-shopping-list-modal.page.scss"],
})
export class NewShoppingListModalPage {
  listTitle = "";

  selectedCollaboratorIds: string[] = [];

  constructor(
    public modalCtrl: ModalController,
    public navCtrl: NavController,
    public utilService: UtilService,
    public loadingService: LoadingService,
    public shoppingListService: ShoppingListService,
    public messagingService: MessagingService,
    public userService: UserService,
    public toastCtrl: ToastController,
  ) {}

  async save() {
    const loading = this.loadingService.start();

    const response = await this.shoppingListService.create({
      title: this.listTitle,
      collaborators: this.selectedCollaboratorIds,
    });

    loading.dismiss();
    if (!response.success) return;

    this.modalCtrl.dismiss({
      success: true,
    });
    this.navCtrl.navigateRoot(
      RouteMap.ShoppingListPage.getPath(response.data.id),
    );
  }

  cancel() {
    this.modalCtrl.dismiss({
      success: false,
    });
  }
}
