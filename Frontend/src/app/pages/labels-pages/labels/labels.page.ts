import { Component } from '@angular/core';
import { NavController, AlertController, ToastController, PopoverController, ModalController } from '@ionic/angular';
import {TranslateService} from '@ngx-translate/core';

import { LoadingService } from '@/services/loading.service';
import { UtilService } from '@/services/util.service';

import { LabelService, Label } from '@/services/label.service';
import { LabelsPopoverPage } from '@/pages/labels-pages/labels-popover/labels-popover.page';
import { ManageLabelModalPage } from '@/pages/labels-pages/manage-label-modal/manage-label-modal.page';
import { PreferencesService, ManageLabelsPreferenceKey } from '@/services/preferences.service';

@Component({
  selector: 'page-labels',
  templateUrl: 'labels.page.html',
  styleUrls: ['labels.page.scss']
})
export class LabelsPage {
  preferences = this.preferencesService.preferences;
  preferenceKeys = ManageLabelsPreferenceKey;

  labels: Label[] = [];

  loading = true;
  selectedLabelIds: string[] = [];
  selectionMode = false;

  constructor(
    public navCtrl: NavController,
    public translate: TranslateService,
    public popoverCtrl: PopoverController,
    public loadingService: LoadingService,
    public alertCtrl: AlertController,
    public modalCtrl: ModalController,
    public toastCtrl: ToastController,
    public labelService: LabelService,
    public utilService: UtilService,
    public preferencesService: PreferencesService) {
  }

  ionViewWillEnter() {
    this.clearSelectedLabels();

    const loading = this.loadingService.start();
    this.loadLabels().finally(() => {
      loading.dismiss();
    });
  }

  refresh(refresher) {
    this.loadLabels().then(() => {
      refresher.target.complete();
    }, () => {
      refresher.target.complete();
    });
  }

  async loadLabels() {
    this.labels = [];
    this.loading = true;

    const response = await this.labelService.fetch();
    this.loading = false;
    if (!response.success) return;

    this.labels = response.data;
  }

  async presentPopover(event) {
    const popover = await this.popoverCtrl.create({
      component: LabelsPopoverPage,
      componentProps: {
        selectionMode: this.selectionMode
      },
      event
    });

    popover.onDidDismiss().then(({ data }) => {
      if (!data) return;
      if (typeof data.selectionMode === 'boolean') {
        this.selectionMode = data.selectionMode;
        if (!this.selectionMode) {
          this.clearSelectedLabels();
        }
      }
    });

    popover.present();
  }

  trackByFn(index, item) {
    return item.id;
  }

  async manage(label: Label) {
    const manageModal = await this.modalCtrl.create({
      component: ManageLabelModalPage,
      componentProps: {
        label
      }
    });

    manageModal.onDidDismiss().then(() => {
      const loading = this.loadingService.start();
      this.loadLabels().finally(() => {
        loading.dismiss();
      });
    });

    manageModal.present();
  }

  selectLabel(label: Label) {
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
    const labelTitles = this.selectedLabelIds.map(labelId => this.labels.filter(label => label.id === labelId)[0].title).join(', ');

    const header = await this.translate.get('pages.labels.modal.delete.header').toPromise();
    const message = await this.translate.get('pages.labels.modal.delete.message', {labelTitles}).toPromise();
    const cancel = await this.translate.get('generic.cancel').toPromise();
    const del = await this.translate.get('generic.delete').toPromise();

    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: cancel,
          role: 'cancel',
          handler: () => { }
        },
        {
          text: del,
          cssClass: 'alertDanger',
          handler: async () => {
            const loading = this.loadingService.start();
            const response = await this.labelService.delete({
              labelIds: this.selectedLabelIds
            });
            if (!response.success) return loading.dismiss();

            this.clearSelectedLabels();

            await this.loadLabels();

            loading.dismiss();
          }
        }
      ]
    });
    alert.present();
  }

  formatDate(input: string) {
    return this.utilService.formatDate(input);
  }
}
