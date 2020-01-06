import { Component } from '@angular/core';
import { NavController, AlertController, ToastController, PopoverController, ModalController } from '@ionic/angular';

import { LoadingService } from '@/services/loading.service';
import { UtilService } from '@/services/util.service';

import { LabelService, Label } from '@/services/label.service';
import { LabelsPopoverPage } from '@/pages/labels-pages/labels-popover/labels-popover.page';
import { ManageLabelModalPage } from '@/pages/labels-pages/manage-label-modal/manage-label-modal.page';

@Component({
  selector: 'page-labels',
  templateUrl: 'labels.page.html',
  styleUrls: ['labels.page.scss']
})
export class LabelsPage {
  labels: Label[] = [];

  loading = true;
  selectedLabelIds: string[] = [];
  selectionMode = false;

  viewOptions: any = {};

  constructor(
    public navCtrl: NavController,
    public popoverCtrl: PopoverController,
    public loadingService: LoadingService,
    public alertCtrl: AlertController,
    public modalCtrl: ModalController,
    public toastCtrl: ToastController,
    public labelService: LabelService,
    public utilService: UtilService) {

    this.loadViewOptions();
  }

  ionViewWillEnter() {
    this.clearSelectedLabels();

    const loading = this.loadingService.start();
    this.loadLabels().then(() => {
      loading.dismiss();
    }, () => {
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

  loadViewOptions() {
    const defaults = {
      showDates: false
    };

    this.viewOptions.showDates = JSON.parse(localStorage.getItem('showDates'));

    for (const key in this.viewOptions) {
      if (this.viewOptions.hasOwnProperty(key)) {
        if (this.viewOptions[key] == null) {
          this.viewOptions[key] = defaults[key];
        }
      }
    }
  }

  loadLabels() {
    this.labels = [];

    return new Promise((resolve, reject) => {
      this.labelService.fetch().then(response => {
        this.labels = response;

        resolve();
      }).catch(err => {
        reject(err);
      });
    });
  }

  async presentPopover(event) {
    const popover = await this.popoverCtrl.create({
      component: LabelsPopoverPage,
      componentProps: {
        viewOptions: this.viewOptions,
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
      this.loadLabels();
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
}
