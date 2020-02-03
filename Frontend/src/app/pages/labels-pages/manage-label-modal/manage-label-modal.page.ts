import { Component, Input } from '@angular/core';
import { NavController, ModalController, AlertController, ToastController } from '@ionic/angular';
import { Label, LabelService } from '@/services/label.service';
import { UtilService, RouteMap, AuthType } from '@/services/util.service';
import { LoadingService } from '@/services/loading.service';

@Component({
  selector: 'page-manage-label-modal',
  templateUrl: 'manage-label-modal.page.html',
  styleUrls: ['manage-label-modal.page.scss']
})
export class ManageLabelModalPage {

  @Input() label: Label;

  createdAt: string;

  constructor(
    public navCtrl: NavController,
    public loadingService: LoadingService,
    public toastCtrl: ToastController,
    public modalCtrl: ModalController,
    public alertCtrl: AlertController,
    public utilService: UtilService,
    public labelService: LabelService) {
    setTimeout(() => {
      this.createdAt = utilService.formatDate(this.label.createdAt);
    });
  }

  async _rename(newTitle: string) {
    const loading = this.loadingService.start();

    this.labelService.update(this.label.id, {
      title: newTitle
    }).then(response => {
      loading.dismiss();

      this.label.title = response.title;
    }).catch(async err => {
      loading.dismiss();

      switch (err.response.status) {
        case 0:
          const offlineToast = await this.toastCtrl.create({
            message: this.utilService.standardMessages.offlineFetchMessage,
            duration: 5000
          });
          offlineToast.present();
          break;
        case 401:
          this.navCtrl.navigateRoot(RouteMap.AuthPage.getPath(AuthType.Login));
          break;
        case 409:
          const conflictAlert = await this.alertCtrl.create({
            header: 'Error',
            message: 'A label with that title already exists',
            buttons: [
              {
                text: 'Dismiss',
                handler: () => {}
              }
            ]
          });

          conflictAlert.present();
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

  async rename() {
    const renamePrompt = await this.alertCtrl.create({
      header: `Rename label ${this.label.title}`,
      inputs: [
        {
          name: 'title',
          type: 'text',
          id: 'title',
          value: this.label.title,
          placeholder: 'New Label Title'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Ok',
          handler: response => {
            this._rename(response.title);
          }
        }
      ]
    });

    await renamePrompt.present();
  }

  async _delete() {
    const loading = this.loadingService.start();

    this.labelService.delete([this.label.id]).then(response => {
      loading.dismiss();

      this.modalCtrl.dismiss();
    }).catch(async err => {
      loading.dismiss();

      switch (err.response.status) {
        case 0:
          const offlineToast = await this.toastCtrl.create({
            message: this.utilService.standardMessages.offlineFetchMessage,
            duration: 5000
          });
          offlineToast.present();
          break;
        case 401:
          this.navCtrl.navigateRoot(RouteMap.AuthPage.getPath(AuthType.Login));
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

  async delete() {
    const deletePrompt = await this.alertCtrl.create({
      header: `Delete label: ${this.label.title}`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Confirm',
          handler: response => {
            this._delete();
          }
        }
      ]
    });

    await deletePrompt.present();
  }

  async _merge(targetTitle: string) {
    const loading = this.loadingService.start();

    let labelsForTargetTitle;
    try {
      labelsForTargetTitle = await this.labelService.fetch({
        title: targetTitle
      });
    } catch (err) {
      loading.dismiss();

      switch (err.response.status) {
        case 0:
          const offlineToast = await this.toastCtrl.create({
            message: this.utilService.standardMessages.offlineFetchMessage,
            duration: 5000
          });
          offlineToast.present();
          break;
        case 401:
          this.navCtrl.navigateRoot(RouteMap.AuthPage.getPath(AuthType.Login));
          break;
        default:
          const errorToast = await this.toastCtrl.create({
            message: this.utilService.standardMessages.unexpectedError,
            duration: 30000
          });
          errorToast.present();
          break;
      }
      return; // Abort merge
    }

    if (!labelsForTargetTitle || labelsForTargetTitle.length === 0) {
      const notFoundAlert = await this.alertCtrl.create({
        header: `Label not found`,
        subHeader: `The target label "${targetTitle}" was not found`,
        message: `You must enter the title for an existing label to merge into.`,
        buttons: [{
          text: 'Ok',
          role: 'cancel'
        }]
      });
  
      await notFoundAlert.present();
      return;
    }

    const targetLabel = labelsForTargetTitle[0];

    if (targetLabel.id === this.label.id) {
      const sameIdAlert = await this.alertCtrl.create({
        header: `Cannot merge label to itself`,
        subHeader: `The source and target labels must be different labels`,
        buttons: [{
          text: 'Ok',
          role: 'cancel'
        }]
      });
  
      await sameIdAlert.present();
      return;
    }

    try {
      await this.labelService.merge(this.label.id, targetLabel.id);
    } catch (err) {
      loading.dismiss();
  
      switch (err.response.status) {
        case 0:
          const offlineToast = await this.toastCtrl.create({
            message: this.utilService.standardMessages.offlineFetchMessage,
            duration: 5000
          });
          offlineToast.present();
          break;
        case 401:
          this.navCtrl.navigateRoot(RouteMap.AuthPage.getPath(AuthType.Login));
          break;
        default:
          const errorToast = await this.toastCtrl.create({
            message: this.utilService.standardMessages.unexpectedError,
            duration: 30000
          });
          errorToast.present();
          break;
      }
      return;
    }

    loading.dismiss();

    const mergeCompleteAlert = await this.alertCtrl.create({
      header: `Merge Complete!`,
      subHeader: `Label "${this.label.title}" has been merged into "${targetLabel.title}" successfully`,
      message: `The label "${this.label.title}" has been deleted - you'll find all it's recipes moved to "${targetLabel.title}".`,
      buttons: [{
        text: 'Dismiss',
        role: 'cancel'
      }]
    });

    await mergeCompleteAlert.present();

    this.modalCtrl.dismiss();
  }

  async merge() {
    const mergePrompt = await this.alertCtrl.create({
      header: `Merge label: ${this.label.title}`,
      subHeader: `What label would you like to merge "${this.label.title}" with?`,
      message: `All recipes in "${this.label.title}" will be relabeled with the target label instead, and the label "${this.label.title}" will be removed.`,
      inputs: [
        {
          name: 'title',
          type: 'text',
          id: 'title',
          value: '',
          placeholder: 'Target label name'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Confirm',
          handler: async response => {
            this._merge(response.title);
          }
        }
      ]
    });

    await mergePrompt.present();
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
