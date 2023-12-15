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
import { PreferencesService } from "../../../services/preferences.service";
import { ShoppingListPreferenceKey } from "@recipesage/util";

@Component({
  selector: "page-shopping-list-ignore-modal",
  templateUrl: "shopping-list-ignore-modal.page.html",
  styleUrls: ["shopping-list-ignore-modal.page.scss"],
})
export class ShoppingListIgnoreModalPage {
  preferenceKey = ShoppingListPreferenceKey;

  constructor(
    public modalCtrl: ModalController,
    public navCtrl: NavController,
    public utilService: UtilService,
    public loadingService: LoadingService,
    public shoppingListService: ShoppingListService,
    public messagingService: MessagingService,
    public userService: UserService,
    public toastCtrl: ToastController,
    public preferencesService: PreferencesService,
  ) {}

  async save() {
    this.preferencesService.save();
  }

  close() {
    this.modalCtrl.dismiss();
  }
}
