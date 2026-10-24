import { Component, inject, ChangeDetectionStrategy } from "@angular/core";
import { ModalController } from "@ionic/angular";

import { PreferencesService } from "../../../services/preferences.service";
import { ShoppingListPreferenceKey } from "@recipesage/util/shared";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { TextAreaComponent } from "../../../components/forms/text-area/text-area.component";
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonLabel,
  IonNote,
  IonFooter,
} from "@ionic/angular";
import { closeOutline, saveOutline } from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "page-shopping-list-ignore-modal",
  templateUrl: "shopping-list-ignore-modal.page.html",
  styleUrls: ["shopping-list-ignore-modal.page.scss"],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    ...SHARED_UI_IMPORTS,
    TextAreaComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonLabel,
    IonNote,
    IonFooter,
  ],
})
export class ShoppingListIgnoreModalPage {
  constructor() {
    addIcons({ closeOutline, saveOutline });
  }

  private modalCtrl = inject(ModalController);
  public preferencesService = inject(PreferencesService);

  ignoreItemTitles =
    this.preferencesService.preferences[
      ShoppingListPreferenceKey.IgnoreItemTitles
    ];

  async save() {
    this.preferencesService.preferences[
      ShoppingListPreferenceKey.IgnoreItemTitles
    ] = this.ignoreItemTitles;
    this.preferencesService.save();
  }

  close() {
    this.modalCtrl.dismiss();
  }
}
