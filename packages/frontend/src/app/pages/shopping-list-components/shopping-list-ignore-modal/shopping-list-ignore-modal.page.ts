import { Component, inject } from "@angular/core";
import { ModalController } from "@ionic/angular/standalone";

import { PreferencesService } from "../../../services/preferences.service";
import { ShoppingListPreferenceKey } from "@recipesage/util/shared";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonItem,
  IonLabel,
  IonTextarea,
  IonFooter,
} from "@ionic/angular/standalone";
import { closeOutline, saveOutline } from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "page-shopping-list-ignore-modal",
  templateUrl: "shopping-list-ignore-modal.page.html",
  styleUrls: ["shopping-list-ignore-modal.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonItem,
    IonLabel,
    IonTextarea,
    IonFooter,
  ],
})
export class ShoppingListIgnoreModalPage {
  constructor() {
    addIcons({ closeOutline, saveOutline });
  }

  private modalCtrl = inject(ModalController);
  public preferencesService = inject(PreferencesService);

  preferenceKey = ShoppingListPreferenceKey;

  async save() {
    this.preferencesService.save();
  }

  close() {
    this.modalCtrl.dismiss();
  }
}
