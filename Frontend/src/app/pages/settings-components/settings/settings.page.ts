import { Component } from '@angular/core';
import { NavController, ToastController, AlertController } from '@ionic/angular';

import { RouteMap } from '@/services/util.service';

const APP_THEME_LOCALSTORAGE_KEY = 'theme';

@Component({
  selector: 'page-settings',
  templateUrl: 'settings.page.html',
  styleUrls: ['settings.page.scss']
})
export class SettingsPage {
  appTheme = localStorage.getItem(APP_THEME_LOCALSTORAGE_KEY) || 'default';

  constructor(
    public navCtrl: NavController,
    public toastCtrl: ToastController,
    public alertCtrl: AlertController) {
  }

  appThemeChanged() {
    // Change in localStorage
    if (['dark', 'light'].indexOf(this.appTheme) > -1) {
      localStorage.setItem(APP_THEME_LOCALSTORAGE_KEY, this.appTheme);
    } else {
      localStorage.removeItem(APP_THEME_LOCALSTORAGE_KEY);
    }

    // Change in current session
    const bodyClasses = document.body.className.split(' ');
    const darkThemeClassIdx = bodyClasses.indexOf('theme-dark');
    if (darkThemeClassIdx > -1) {
      bodyClasses.splice(darkThemeClassIdx, 1);
    }
    if (this.appTheme === 'dark') bodyClasses.push('theme-dark');
    document.body.className = bodyClasses.join(' ');
  }

  goToImport() {
    this.navCtrl.navigateForward(RouteMap.ImportPage.getPath());
  }

  goToExport() {
    this.navCtrl.navigateForward(RouteMap.ExportPage.getPath());
  }

  goToAccount() {
    this.navCtrl.navigateForward(RouteMap.AccountPage.getPath());
  }

  checkForUpdate() {
    (window as any).updateSW(async () => {
      const alert = await this.alertCtrl.create({
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
              (window as any).location.reload(true);
            }
          }]
      });
      alert.present();
    }, async () => {
      const toast = await this.toastCtrl.create({
        message: 'We were unable to check for an update at this time.',
        duration: 4000
      });

      toast.present();
    });
  }
}
