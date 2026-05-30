import { Component, inject } from "@angular/core";
import {
  ModalController,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
} from "@ionic/angular/standalone";
import type { LabelSummary } from "@recipesage/prisma";
import { close } from "ionicons/icons";
import { addIcons } from "ionicons";

import { SHARED_UI_IMPORTS } from "../../../../providers/shared-ui.provider";
import { SelectLabelComponent } from "../../../../components/select-label/select-label.component";

@Component({
  standalone: true,
  selector: "page-cookbook-add-label-modal",
  templateUrl: "add-label-modal.component.html",
  imports: [
    ...SHARED_UI_IMPORTS,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    SelectLabelComponent,
  ],
})
export class CookbookAddLabelModalComponent {
  private modalCtrl = inject(ModalController);

  constructor() {
    addIcons({ close });
  }

  onSelect(label: LabelSummary) {
    this.modalCtrl.dismiss(label);
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
