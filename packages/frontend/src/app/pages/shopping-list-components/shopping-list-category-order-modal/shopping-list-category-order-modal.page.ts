import {
  Component,
  inject,
  Input,
  ChangeDetectionStrategy,
} from "@angular/core";
import { ModalController } from "@ionic/angular";

import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { TextAreaComponent } from "../../../components/forms/text-area/text-area.component";
import { ServerActionsService } from "../../../services/server-actions.service";
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
  selector: "page-shopping-list-category-order-modal",
  templateUrl: "shopping-list-category-order-modal.page.html",
  styleUrls: ["shopping-list-category-order-modal.page.scss"],
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
export class ShoppingListCategoryOrderModalPage {
  constructor() {
    addIcons({ closeOutline, saveOutline });
  }

  private modalCtrl = inject(ModalController);
  private serverActionsService = inject(ServerActionsService);

  @Input({
    required: true,
  })
  shoppingListId!: string;

  @Input({
    required: true,
  })
  categoryOrder: string | undefined;

  async save() {
    await this.serverActionsService.shoppingLists.updateShoppingList({
      id: this.shoppingListId,
      categoryOrder: this.categoryOrder,
    });
    this.close();
  }

  close() {
    this.modalCtrl.dismiss();
  }
}
