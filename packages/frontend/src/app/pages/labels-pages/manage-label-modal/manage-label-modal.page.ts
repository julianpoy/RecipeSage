import { Component, Input, inject } from "@angular/core";
import {
  NavController,
  ModalController,
  AlertController,
  ToastController,
} from "@ionic/angular/standalone";
import { UtilService, RouteMap } from "../../../services/util.service";
import { LoadingService } from "../../../services/loading.service";
import { TranslateService } from "@ngx-translate/core";
import type { LabelSummary } from "@recipesage/prisma";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { ServerActionsService } from "../../../services/server-actions.service";
import { TextInputComponent } from "../../../components/forms/text-input/text-input.component";
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
  IonFooter,
  IonModal,
} from "@ionic/angular/standalone";
import {
  closeOutline,
  createOutline,
  folderOpenOutline,
  gitNetworkOutline,
  pricetagOutline,
  trashOutline,
} from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "page-manage-label-modal",
  templateUrl: "manage-label-modal.page.html",
  styleUrls: ["manage-label-modal.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    TextInputComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonItem,
    IonLabel,
    IonFooter,
    IonModal,
  ],
})
export class ManageLabelModalPage {
  navCtrl = inject(NavController);
  translate = inject(TranslateService);
  loadingService = inject(LoadingService);
  toastCtrl = inject(ToastController);
  modalCtrl = inject(ModalController);
  alertCtrl = inject(AlertController);
  utilService = inject(UtilService);
  serverActionsService = inject(ServerActionsService);

  @Input({
    required: true,
  })
  label!: LabelSummary;

  createdAt?: string;

  isRenameModalOpen = false;
  renameInput = "";
  isMergeModalOpen = false;
  mergeInput = "";

  constructor() {
    addIcons({
      closeOutline,
      createOutline,
      folderOpenOutline,
      gitNetworkOutline,
      pricetagOutline,
      trashOutline,
    });
    const utilService = this.utilService;

    setTimeout(() => {
      this.createdAt = utilService.formatDate(this.label.createdAt);
    });
  }

  async _rename(newTitle: string) {
    const loading = this.loadingService.start();

    const header = await this.translate
      .get("pages.manageLabelModal.renameConflict.header")
      .toPromise();
    const message = await this.translate
      .get("pages.manageLabelModal.renameConflict.message")
      .toPromise();
    const okay = await this.translate.get("generic.okay").toPromise();

    const response = await this.serverActionsService.labels.updateLabel(
      {
        id: this.label.id,
        title: newTitle,
      },
      {
        409: async () => {
          (
            await this.alertCtrl.create({
              header,
              message,
              buttons: [
                {
                  text: okay,
                  handler: () => {},
                },
              ],
            })
          ).present();
        },
      },
    );
    loading.dismiss();
    if (!response) return;

    this.label.title = newTitle;
  }

  async view() {
    await this.modalCtrl.dismiss();

    this.navCtrl.navigateForward(
      RouteMap.HomePage.getPath("main", {
        selectedLabels: [this.label.title],
      }),
      {
        state: {
          showBack: true,
        },
      },
    );
  }

  rename() {
    this.renameInput = this.label.title;
    this.isRenameModalOpen = true;
  }

  submitRename() {
    const title = this.renameInput;
    this.isRenameModalOpen = false;
    this._rename(title);
  }

  async _delete() {
    const loading = this.loadingService.start();

    const response = await this.serverActionsService.labels.deleteLabel({
      id: this.label.id,
    });
    loading.dismiss();
    if (!response) return;

    this.modalCtrl.dismiss();
  }

  async _deleteWithRecipes() {
    const loading = this.loadingService.start();

    const response = await this.serverActionsService.labels.deleteLabel({
      id: this.label.id,
      includeAttachedRecipes: true,
    });
    loading.dismiss();
    if (!response) return;

    this.modalCtrl.dismiss();
  }

  async delete() {
    const header = await this.translate
      .get("pages.manageLabelModal.delete.header", { name: this.label.title })
      .toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();
    const del = await this.translate.get("generic.delete").toPromise();

    const deletePrompt = await this.alertCtrl.create({
      header,
      buttons: [
        {
          text: cancel,
          role: "cancel",
          cssClass: "secondary",
        },
        {
          text: del,
          cssClass: "alertDanger",
          handler: () => {
            this._delete();
          },
        },
      ],
    });

    await deletePrompt.present();
  }

  async deleteWithRecipes() {
    const header = await this.translate
      .get("pages.manageLabelModal.deleteWithRecipes.header", {
        name: this.label.title,
      })
      .toPromise();
    const message = await this.translate
      .get("pages.manageLabelModal.deleteWithRecipes.message", {
        name: this.label.title,
      })
      .toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();
    const del = await this.translate.get("generic.delete").toPromise();

    const deletePrompt = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: cancel,
          role: "cancel",
          cssClass: "secondary",
        },
        {
          text: del,
          cssClass: "alertDanger",
          handler: () => {
            this._deleteWithRecipes();
          },
        },
      ],
    });

    await deletePrompt.present();
  }

  async _merge(targetTitle: string) {
    const loading = this.loadingService.start();

    const targetLabel = await this.serverActionsService.labels.getLabelByTitle(
      {
        title: targetTitle,
      },
      {
        404: async () => {
          const header = await this.translate
            .get("pages.manageLabelModal.notFound.header")
            .toPromise();
          const subHeader = await this.translate
            .get("pages.manageLabelModal.notFound.subHeader", {
              name: targetTitle,
            })
            .toPromise();
          const message = await this.translate
            .get("pages.manageLabelModal.notFound.message")
            .toPromise();
          const okay = await this.translate.get("generic.okay").toPromise();

          const notFoundAlert = await this.alertCtrl.create({
            header,
            subHeader,
            message,
            buttons: [
              {
                text: okay,
                role: "cancel",
              },
            ],
          });

          await notFoundAlert.present();
        },
      },
    );
    if (!targetLabel) {
      loading.dismiss();
      return;
    }

    if (targetLabel.id === this.label.id) {
      const header = await this.translate
        .get("pages.manageLabelModal.selfMerge.header")
        .toPromise();
      const subHeader = await this.translate
        .get("pages.manageLabelModal.selfMerge.subHeader", {
          name: targetTitle,
        })
        .toPromise();
      const okay = await this.translate.get("generic.okay").toPromise();

      const sameIdAlert = await this.alertCtrl.create({
        header,
        subHeader,
        buttons: [
          {
            text: okay,
            role: "cancel",
          },
        ],
      });

      await sameIdAlert.present();
      loading.dismiss();

      return;
    }

    const mergeResponse = await this.serverActionsService.labels.mergeLabels({
      sourceId: this.label.id,
      targetId: targetLabel.id,
    });

    loading.dismiss();
    if (!mergeResponse) return;

    const header = await this.translate
      .get("pages.manageLabelModal.mergeComplete.header")
      .toPromise();
    const subHeader = await this.translate
      .get("pages.manageLabelModal.mergeComplete.subHeader", {
        sourceTitle: this.label.title,
        targetTitle: targetLabel.title,
      })
      .toPromise();
    const message = await this.translate
      .get("pages.manageLabelModal.mergeComplete.message", {
        sourceTitle: this.label.title,
        targetTitle: targetLabel.title,
      })
      .toPromise();
    const okay = await this.translate.get("generic.okay").toPromise();

    const mergeCompleteAlert = await this.alertCtrl.create({
      header,
      subHeader,
      message,
      buttons: [
        {
          text: okay,
          role: "cancel",
        },
      ],
    });

    await mergeCompleteAlert.present();

    this.modalCtrl.dismiss();
  }

  merge() {
    this.mergeInput = "";
    this.isMergeModalOpen = true;
  }

  submitMerge() {
    const title = this.mergeInput;
    this.isMergeModalOpen = false;
    this._merge(title);
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
