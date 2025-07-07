import { Component, Input, inject } from "@angular/core";
import {
  NavController,
  ModalController,
  AlertController,
  ToastController,
  ToggleCustomEvent,
} from "@ionic/angular";
import { Label, LabelService } from "~/services/label.service";
import { UtilService, RouteMap, AuthType } from "~/services/util.service";
import { LoadingService } from "~/services/loading.service";
import { TranslateService } from "@ngx-translate/core";
import { RecipeService } from "~/services/recipe.service";
import type { LabelGroupSummary, LabelSummary } from "@recipesage/prisma";
import { TRPCService } from "../../../services/trpc.service";
import {
  SelectableItem,
  SelectMultipleItemsComponent,
} from "../../../components/select-multiple-items/select-multiple-items.component";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";

@Component({
  selector: "page-new-label-item-modal",
  templateUrl: "new-label-item-modal.page.html",
  styleUrls: ["new-label-item-modal.page.scss"],
  imports: [...SHARED_UI_IMPORTS, SelectMultipleItemsComponent],
})
export class NewLabelItemModalPage {
  private navCtrl = inject(NavController);
  private translate = inject(TranslateService);
  private loadingService = inject(LoadingService);
  private toastCtrl = inject(ToastController);
  private modalCtrl = inject(ModalController);
  private alertCtrl = inject(AlertController);
  private utilService = inject(UtilService);
  private labelService = inject(LabelService);
  private recipeService = inject(RecipeService);
  private trpcService = inject(TRPCService);

  @Input({
    required: false,
  })
  labelGroup?: LabelGroupSummary;

  type: "label" | "group" | null = null;

  title: string = "";
  labels: LabelSummary[] = [];
  ungroupedLabels: LabelSummary[] = [];
  selectedLabels: LabelSummary[] = [];

  warnWhenNotPresent = false;

  async ionViewWillEnter() {
    if (this.labelGroup) {
      this.type = "group";
      this.title = this.labelGroup.title;
    }
    const labelsResult = await this.trpcService.handle(
      this.trpcService.trpc.labels.getLabels.query(),
    );
    if (labelsResult) {
      this.labels = labelsResult;
      this.ungroupedLabels = labelsResult.filter((label) => {
        return !label.labelGroupId;
      });

      if (this.labelGroup) {
        // Dialogue was opened with a label
        for (const label of labelsResult) {
          if (label.labelGroupId === this.labelGroup.id) {
            this.selectedLabels.push(label);
          }
        }
      }
    }
  }

  warnToggle(event: ToggleCustomEvent) {
    this.warnWhenNotPresent = event.detail.checked;
  }

  cancel() {
    this.modalCtrl.dismiss();
  }

  mapLabelsToSelectableItems(labels: LabelSummary[]) {
    const mapped = labels.map((label) => ({
      id: label.id,
      title: label.title,
      icon: "pricetag",
    }));

    return mapped;
  }

  selectedLabelsChange(selectedLabels: SelectableItem[]) {
    const labelsById = this.labels.reduce(
      (acc, label) => {
        acc[label.id] = label;
        return acc;
      },
      {} as Record<string, LabelSummary>,
    );

    this.selectedLabels = selectedLabels
      .map((selectedLabel) => labelsById[selectedLabel.id])
      .filter((label) => label);
  }

  save() {
    if (this.type === "label") {
      this.saveLabel();
    }
    if (this.type === "group") {
      this.saveLabelGroup();
    }
  }

  async saveLabel() {
    if (!this.title) return;

    const loading = this.loadingService.start();
    await this.trpcService.handle(
      this.trpcService.trpc.labels.createLabel.mutate({
        title: this.title,
        labelGroupId: null,
      }),
    );
    loading.dismiss();

    this.cancel();
  }

  async saveLabelGroup() {
    if (!this.title) return;

    if (!this.selectedLabels.length) {
      const header = await this.translate
        .get("pages.manageLabelGroupModal.noLabelsSelected")
        .toPromise();
      const message = await this.translate
        .get("pages.manageLabelGroupModal.noLabelsSelectedMessage")
        .toPromise();
      const ignore = await this.translate.get("generic.ignore").toPromise();
      const cancel = await this.translate.get("generic.cancel").toPromise();

      const alert = await this.alertCtrl.create({
        header,
        message,
        buttons: [
          {
            text: ignore,
            handler: () => this._saveLabelGroup(),
          },
          {
            text: cancel,
            role: "cancel",
          },
        ],
      });

      await alert.present();

      return;
    }

    return this._saveLabelGroup();
  }

  async _saveLabelGroup() {
    if (!this.title) return;

    const loading = this.loadingService.start();
    const result = await this.trpcService.handle(
      this.trpcService.trpc.labelGroups.createLabelGroup.mutate({
        title: this.title,
        labelIds: this.selectedLabels.map((selectedLabel) => selectedLabel.id),
        warnWhenNotPresent: this.warnWhenNotPresent,
      }),
      {
        409: async () => {
          const header = await this.translate
            .get("pages.manageLabelGroupModal.conflict")
            .toPromise();
          const message = await this.translate
            .get("pages.manageLabelGroupModal.conflictMessage")
            .toPromise();
          const okay = await this.translate.get("generic.okay").toPromise();

          const alert = await this.alertCtrl.create({
            header,
            message,
            buttons: [
              {
                text: okay,
                role: "cancel",
              },
            ],
          });

          alert.present();
        },
      },
    );
    loading.dismiss();
    if (result) {
      this.cancel();
    }
  }
}
