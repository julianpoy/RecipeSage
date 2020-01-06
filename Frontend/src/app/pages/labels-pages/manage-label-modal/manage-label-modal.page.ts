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
          const conflictToast = await this.toastCtrl.create({
            message: 'Error: A label with that title already exists',
            duration: 5000
          });
          conflictToast.present();
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

  cancel() {
    this.modalCtrl.dismiss();
  }
}
