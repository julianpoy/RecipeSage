import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ToastController, AlertController } from 'ionic-angular';

@IonicPage({
  priority: 'low'
})
@Component({
  selector: 'page-settings',
  templateUrl: 'settings.html',
})
export class SettingsPage {

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public toastCtrl: ToastController,
    public alertCtrl: AlertController) {
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad SettingsPage');
  }
  
  goTo(state) {
    this.navCtrl.push(state);
  }

  checkForUpdate() {
    var me = this;

    (<any>window).updateSW(function() {
      let alert = me.alertCtrl.create({
        title: 'App will reload',
        subTitle: 'The app will reload to check for an update.',
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
    }, function() {
      let toast = me.toastCtrl.create({
        message: 'We were unable to check for an update at this time.',
        duration: 4000
      });
      
      toast.present();
    });
  }
}
