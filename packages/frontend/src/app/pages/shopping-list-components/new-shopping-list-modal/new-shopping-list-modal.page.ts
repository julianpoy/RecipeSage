import { Component, inject, Input } from "@angular/core";
import {
  ModalController,
  ToastController,
  NavController,
} from "@ionic/angular/standalone";

import { LoadingService } from "../../../services/loading.service";
import { MessagingService } from "../../../services/messaging.service";
import { UtilService, RouteMap } from "../../../services/util.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { SelectCollaboratorsComponent } from "../../../components/select-collaborators/select-collaborators.component";
import { TextInputComponent } from "../../../components/forms/text-input/text-input.component";
import { ServerActionsService } from "../../../services/server-actions.service";
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonFooter,
  IonLabel,
} from "@ionic/angular/standalone";
import { close, list } from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "page-new-shopping-list-modal",
  templateUrl: "new-shopping-list-modal.page.html",
  styleUrls: ["new-shopping-list-modal.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    SelectCollaboratorsComponent,
    TextInputComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonFooter,
    IonLabel,
  ],
})
export class NewShoppingListModalPage {
  constructor() {
    addIcons({ close, list });
  }

  modalCtrl = inject(ModalController);
  navCtrl = inject(NavController);
  utilService = inject(UtilService);
  loadingService = inject(LoadingService);
  serverActionsService = inject(ServerActionsService);
  messagingService = inject(MessagingService);
  toastCtrl = inject(ToastController);

  @Input() openAfterCreate = true;

  saving = false;
  listTitle = "";

  selectedCollaboratorIds: string[] = [];

  async save() {
    if (this.saving) return;

    this.saving = true;
    const loading = this.loadingService.start();

    const response =
      await this.serverActionsService.shoppingLists.createShoppingList({
        title: this.listTitle,
        collaboratorUserIds: this.selectedCollaboratorIds,
      });

    this.saving = false;
    loading.dismiss();
    if (!response) return;

    this.modalCtrl.dismiss({
      success: true,
      id: response.id,
    });
    if (this.openAfterCreate) {
      this.navCtrl.navigateRoot(RouteMap.ShoppingListPage.getPath(response.id));
    }
  }

  cancel() {
    this.modalCtrl.dismiss({
      success: false,
    });
  }
}
