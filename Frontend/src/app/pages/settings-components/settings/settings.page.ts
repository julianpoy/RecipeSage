import { Component } from '@angular/core';
import { NavController, ToastController, AlertController } from '@ionic/angular';

@Component({
  selector: 'page-settings',
  templateUrl: 'settings.page.html',
  styleUrls: ['settings.page.scss']
})
export class SettingsPage {

  constructor(
    public navCtrl: NavController,
    public toastCtrl: ToastController,
    public alertCtrl: AlertController) {
  }


  goTo(state) {
    // this.navCtrl.push(state);
  }

  checkForUpdate() {
    (<any>window).updateSW(async () => {
      let alert = await this.alertCtrl.create({
        header: 'App will reload',
        subHeader: 'The app will reload to check for an update.',
        buttons: [
          {
            text: 'Cancel',
            handler: () => {
            }
          },
          {
            text: 'Continue',
            handler: () => {
              (<any>window).location.reload(true);
            }
          }]
      });
      alert.present();
    }, async () => {
      let toast = await this.toastCtrl.create({
        message: 'We were unable to check for an update at this time.',
        duration: 4000
      });

      toast.present();
    });
  }
}
