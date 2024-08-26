import { Component } from "@angular/core";
import { ModalController } from "@ionic/angular";

import { PreferencesService } from "../../../services/preferences.service";
import { ShoppingListPreferenceKey } from "@recipesage/util/shared";

@Component({
  selector: "page-shopping-list-ignore-modal",
  templateUrl: "shopping-list-ignore-modal.page.html",
  styleUrls: ["shopping-list-ignore-modal.page.scss"],
})
export class ShoppingListIgnoreModalPage {
  preferenceKey = ShoppingListPreferenceKey;

  constructor(
    private modalCtrl: ModalController,
    public preferencesService: PreferencesService,
  ) {}

  async save() {
    this.preferencesService.save();
  }

  close() {
    this.modalCtrl.dismiss();
  }
}
