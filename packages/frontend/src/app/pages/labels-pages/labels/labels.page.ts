import { Component } from "@angular/core";
import {
  NavController,
  AlertController,
  ToastController,
  PopoverController,
  ModalController,
} from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import { LoadingService } from "~/services/loading.service";
import { UtilService } from "~/services/util.service";

import { LabelService, Label } from "~/services/label.service";
import { LabelsPopoverPage } from "~/pages/labels-pages/labels-popover/labels-popover.page";
import { ManageLabelModalPage } from "~/pages/labels-pages/manage-label-modal/manage-label-modal.page";
import { PreferencesService } from "~/services/preferences.service";
import { ManageLabelsPreferenceKey } from "@recipesage/util";
import { TRPCService } from "../../../services/trpc.service";
import { LabelSummary } from "packages/trpc/src/types/labelSummary";
import { LabelGroupSummary } from "packages/trpc/src/types/labelGroupSummary";
import { NewLabelItemModalPage } from "../new-label-item-modal/new-label-item-modal.page";
import { ManageLabelGroupModalPage } from "../manage-label-group-modal/manage-label-group-modal.page";

@Component({
  selector: "page-labels",
  templateUrl: "labels.page.html",
  styleUrls: ["labels.page.scss"],
})
export class LabelsPage {
  preferences = this.preferencesService.preferences;
  preferenceKeys = ManageLabelsPreferenceKey;

  labels: LabelSummary[] = [];
  labelGroups: LabelGroupSummary[] = [];

  loading = true;
  selectedLabelIds: string[] = [];
  selectionMode = false;

  constructor(
    private navCtrl: NavController,
    private translate: TranslateService,
    private popoverCtrl: PopoverController,
    private loadingService: LoadingService,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController,
    private toastCtrl: ToastController,
    private labelService: LabelService,
    private utilService: UtilService,
    private preferencesService: PreferencesService,
    private trpcService: TRPCService,
  ) {}

  ionViewWillEnter() {
    this.clearSelectedLabels();
    this.loadWithBar();
  }

  refresh(refresher: any) {
    this.load().finally(() => {
      refresher.target.complete();
    });
  }

  async load() {
    this.labels = [];
    this.labelGroups = [];
    this.loading = true;

    const labelsResponse = await this.trpcService.handle(
      this.trpcService.trpc.labels.getLabels.query(),
    );
    const labelGroupsResponse = await this.trpcService.handle(
      this.trpcService.trpc.labelGroups.getLabelGroups.query(),
    );
    this.loading = false;
    if (!labelsResponse || !labelGroupsResponse) return;

    this.labels = labelsResponse;
    this.labelGroups = labelGroupsResponse;
  }

  loadWithBar() {
    const loading = this.loadingService.start();
    this.load().finally(() => {
      loading.dismiss();
    });
  }

  async presentPopover(event: Event) {
    const popover = await this.popoverCtrl.create({
      component: LabelsPopoverPage,
      componentProps: {
        selectionMode: this.selectionMode,
      },
      event,
    });

    popover.onDidDismiss().then(({ data }) => {
      if (!data) return;
      if (typeof data.selectionMode === "boolean") {
        this.selectionMode = data.selectionMode;
        if (!this.selectionMode) {
          this.clearSelectedLabels();
        }
      }
    });

    popover.present();
  }

  trackByFn(_: number, item: { id: string }) {
    return item.id;
  }

  async new() {
    const newModal = await this.modalCtrl.create({
      component: NewLabelItemModalPage,
    });

    newModal.onDidDismiss().then(() => {
      this.loadWithBar();
    });

    newModal.present();
  }

  async manageLabelGroup(labelGroup: LabelGroupSummary) {
    const manageModal = await this.modalCtrl.create({
      component: ManageLabelGroupModalPage,
      componentProps: {
        labelGroup,
      },
    });

    manageModal.onDidDismiss().then(() => {
      this.loadWithBar();
    });

    manageModal.present();
  }

  async manageLabel(label: LabelSummary) {
    const manageModal = await this.modalCtrl.create({
      component: ManageLabelModalPage,
      componentProps: {
        label,
      },
    });

    manageModal.onDidDismiss().then(() => {
      this.loadWithBar();
    });

    manageModal.present();
  }

  selectLabel(label: LabelSummary) {
    const index = this.selectedLabelIds.indexOf(label.id);
    if (index > -1) {
      this.selectedLabelIds.splice(index, 1);
    } else {
      this.selectedLabelIds.push(label.id);
    }
  }

  clearSelectedLabels() {
    this.selectionMode = false;
    this.selectedLabelIds = [];
  }

  async deleteSelectedLabels() {
    const labelTitles = this.selectedLabelIds
      .map(
        (labelId) =>
          this.labels.filter((label) => label.id === labelId)[0].title,
      )
      .join(", ");

    const header = await this.translate
      .get("pages.labels.modal.delete.header")
      .toPromise();
    const message = await this.translate
      .get("pages.labels.modal.delete.message", { labelTitles })
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
          handler: () => {},
        },
        {
          text: del,
          cssClass: "alertDanger",
          handler: async () => {
            const loading = this.loadingService.start();
            const response = await this.labelService.delete({
              labelIds: this.selectedLabelIds,
            });
            if (!response.success) return loading.dismiss();

            this.clearSelectedLabels();

            await this.load();

            loading.dismiss();
          },
        },
      ],
    });
    alert.present();
  }

  formatDate(input: string | number | Date) {
    return this.utilService.formatDate(input);
  }
}
