import { Component, Input } from "@angular/core";
import {
  NavController,
  ModalController,
  AlertController,
  ToastController,
} from "@ionic/angular";
import { Label, LabelService } from "~/services/label.service";
import { UtilService, RouteMap, AuthType } from "~/services/util.service";
import { LoadingService } from "~/services/loading.service";
import { TranslateService } from "@ngx-translate/core";
import { RecipeService } from "~/services/recipe.service";
import { LabelSummary } from "packages/trpc/src/types/labelSummary";

@Component({
  selector: "page-manage-label-modal",
  templateUrl: "manage-label-modal.page.html",
  styleUrls: ["manage-label-modal.page.scss"],
})
export class ManageLabelModalPage {
  @Input({
    required: true,
  })
  label!: LabelSummary;

  createdAt?: string;

  constructor(
    public navCtrl: NavController,
    public translate: TranslateService,
    public loadingService: LoadingService,
    public toastCtrl: ToastController,
    public modalCtrl: ModalController,
    public alertCtrl: AlertController,
    public utilService: UtilService,
    public labelService: LabelService,
    public recipeService: RecipeService,
  ) {
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

    const response = await this.labelService.update(
      this.label.id,
      {
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
    if (!response.success) return;

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

  async rename() {
    const header = await this.translate
      .get("pages.manageLabelModal.rename.header", { name: this.label.title })
      .toPromise();
    const placeholder = await this.translate
      .get("pages.manageLabelModal.rename.placeholder")
      .toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();
    const okay = await this.translate.get("generic.okay").toPromise();

    const renamePrompt = await this.alertCtrl.create({
      header,
      inputs: [
        {
          name: "title",
          type: "text",
          id: "title",
          value: this.label.title,
          placeholder,
        },
      ],
      buttons: [
        {
          text: cancel,
          role: "cancel",
          cssClass: "secondary",
        },
        {
          text: okay,
          handler: (response) => {
            this._rename(response.title);
          },
        },
      ],
    });

    await renamePrompt.present();
  }

  async _delete() {
    const loading = this.loadingService.start();

    const response = await this.labelService.delete({
      labelIds: [this.label.id],
    });
    loading.dismiss();
    if (!response.success) return;

    this.modalCtrl.dismiss();
  }

  async _deleteWithRecipes() {
    const loading = this.loadingService.start();

    const response = await this.recipeService.deleteByLabelIds({
      labelIds: [this.label.id],
    });
    loading.dismiss();
    if (!response.success) return;

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
          handler: (response) => {
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
          handler: (response) => {
            this._deleteWithRecipes();
          },
        },
      ],
    });

    await deletePrompt.present();
  }

  async _merge(targetTitle: string) {
    const loading = this.loadingService.start();

    const labelResults = await this.labelService.fetch({
      title: targetTitle,
    });
    if (!labelResults.success) return;

    const labelsForTargetTitle = labelResults.data;

    if (labelsForTargetTitle.length === 0) {
      const header = await this.translate
        .get("pages.manageLabelModal.notFound.header")
        .toPromise();
      const subHeader = await this.translate
        .get("pages.manageLabelModal.notFound.subHeader", { name: targetTitle })
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
      loading.dismiss();

      return;
    }

    const targetLabel = labelsForTargetTitle[0];

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

    const mergeResponse = await this.labelService.merge({
      sourceLabelId: this.label.id,
      targetLabelId: targetLabel.id,
    });
    if (!mergeResponse.success) return;

    loading.dismiss();

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

  async merge() {
    const header = await this.translate
      .get("pages.manageLabelModal.merge.header", { title: this.label.title })
      .toPromise();
    const subHeader = await this.translate
      .get("pages.manageLabelModal.merge.subHeader", {
        title: this.label.title,
      })
      .toPromise();
    const message = await this.translate
      .get("pages.manageLabelModal.merge.message", { title: this.label.title })
      .toPromise();
    const placeholder = await this.translate
      .get("pages.manageLabelModal.merge.placeholder")
      .toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();
    const confirm = await this.translate.get("generic.confirm").toPromise();

    const mergePrompt = await this.alertCtrl.create({
      header,
      subHeader,
      message,
      inputs: [
        {
          name: "title",
          type: "text",
          id: "title",
          value: "",
          placeholder,
        },
      ],
      buttons: [
        {
          text: cancel,
          role: "cancel",
          cssClass: "secondary",
        },
        {
          text: confirm,
          handler: async (response) => {
            this._merge(response.title);
          },
        },
      ],
    });

    await mergePrompt.present();
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
