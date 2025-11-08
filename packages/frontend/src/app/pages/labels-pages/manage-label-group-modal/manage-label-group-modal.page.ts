import { Component, Input, inject } from "@angular/core";
import {
  ModalController,
  AlertController,
  ToggleCustomEvent,
} from "@ionic/angular";
import { LoadingService } from "~/services/loading.service";
import { TranslateService } from "@ngx-translate/core";
import type { LabelGroupSummary, LabelSummary } from "@recipesage/prisma";
import { TRPCService } from "../../../services/trpc.service";
import {
  SelectableItem,
  SelectMultipleItemsComponent,
} from "../../../components/select-multiple-items/select-multiple-items.component";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";

@Component({
  selector: "page-manage-label-group-modal",
  templateUrl: "manage-label-group-modal.page.html",
  styleUrls: ["manage-label-group-modal.page.scss"],
  imports: [...SHARED_UI_IMPORTS, SelectMultipleItemsComponent],
})
export class ManageLabelGroupModalPage {
  private translate = inject(TranslateService);
  private loadingService = inject(LoadingService);
  private modalCtrl = inject(ModalController);
  private alertCtrl = inject(AlertController);
  private trpcService = inject(TRPCService);

  @Input({
    required: true,
  })
  labelGroup!: LabelGroupSummary;

  title: string = "";
  labels: LabelSummary[] = [];
  ungroupedLabels: LabelSummary[] = [];
  selectedLabels: LabelSummary[] = [];

  warnWhenNotPresent: boolean = false;

  async ionViewWillEnter() {
    this.title = this.labelGroup.title;
    this.warnWhenNotPresent = this.labelGroup.warnWhenNotPresent;

    const labelsResult = await this.trpcService.handle(
      this.trpcService.trpc.labels.getLabels.query(),
    );
    if (labelsResult) {
      this.labels = labelsResult;
      this.ungroupedLabels = labelsResult.filter((label) => {
        return !label.labelGroupId;
      });

      for (const label of labelsResult) {
        if (label.labelGroupId === this.labelGroup.id) {
          this.selectedLabels.push(label);
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

  async save() {
    if (!this.title) return;

    const loading = this.loadingService.start();
    const result = await this.trpcService.handle(
      this.trpcService.trpc.labelGroups.updateLabelGroup.mutate({
        id: this.labelGroup.id,
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

  async _delete() {
    const loading = this.loadingService.start();
    await this.trpcService.handle(
      this.trpcService.trpc.labelGroups.deleteLabelGroup.mutate({
        id: this.labelGroup.id,
      }),
    );
    loading.dismiss();

    this.cancel();
  }

  async delete() {
    const header = await this.translate
      .get("pages.manageLabelGroupModal.delete.header")
      .toPromise();
    const message = await this.translate
      .get("pages.manageLabelGroupModal.delete.message", {
        title: this.labelGroup.title,
      })
      .toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();
    const del = await this.translate.get("generic.delete").toPromise();

    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: cancel,
          role: "cancel",
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
    alert.present();
  }
}
