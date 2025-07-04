import { Component, inject } from "@angular/core";
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
import { ShoppingListPreferenceKey } from "@recipesage/util/shared";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";

@Component({
  selector: "page-shopping-list-ignore-modal",
  templateUrl: "shopping-list-ignore-modal.page.html",
  styleUrls: ["shopping-list-ignore-modal.page.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class ShoppingListIgnoreModalPage {
  modalCtrl = inject(ModalController);
  navCtrl = inject(NavController);
  utilService = inject(UtilService);
  loadingService = inject(LoadingService);
  shoppingListService = inject(ShoppingListService);
  messagingService = inject(MessagingService);
  userService = inject(UserService);
  toastCtrl = inject(ToastController);
  preferencesService = inject(PreferencesService);

  preferenceKey = ShoppingListPreferenceKey;

  async save() {
    this.preferencesService.save();
  }

  close() {
    this.modalCtrl.dismiss();
  }
}
