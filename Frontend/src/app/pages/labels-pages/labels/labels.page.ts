import { Component } from '@angular/core';
import { NavController, AlertController, ToastController, PopoverController, ModalController } from '@ionic/angular';

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

  loadLabels() {
    this.labels = [];
    this.loading = true;

    return this.labelService.fetch().then(response => {
      this.labels = response;
      this.loading = false;
    });
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
    const labelTitles = this.selectedLabelIds.map(labelId => this.labels.filter(label => label.id === labelId)[0].title)
                                              .join('<br />');

    const alert = await this.alertCtrl.create({
      header: 'Confirm Delete',
      message: `This will permanently delete the selected labels from your account. This action is irreversible.<br /><br />
                The following labels will be deleted:<br />${labelTitles}`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => { }
        },
        {
          text: 'Delete',
          cssClass: 'alertDanger',
          handler: () => {
            const loading = this.loadingService.start();
            this.labelService.delete(this.selectedLabelIds).then(() => {
              this.clearSelectedLabels();

              this.loadLabels().then(() => {
                loading.dismiss();
              }, () => {
                loading.dismiss();
              });
            }).catch(async err => {
              switch (err.response.status) {
                case 0:
                  const offlineToast = await this.toastCtrl.create({
                    message: this.utilService.standardMessages.offlinePushMessage,
                    duration: 5000
                  });
                  offlineToast.present();
                  break;
                default:
                  const errorToast = await this.toastCtrl.create({
                    message: this.utilService.standardMessages.unexpectedError,
                    duration: 30000
                  });
                  errorToast.present();
                  break;
              }
            });
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
