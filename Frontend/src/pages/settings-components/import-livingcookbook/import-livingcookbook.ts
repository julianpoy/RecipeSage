import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ToastController } from 'ionic-angular';

import { LoadingServiceProvider } from '../../../providers/loading-service/loading-service';
import { RecipeServiceProvider } from '../../../providers/recipe-service/recipe-service';
import { UtilServiceProvider } from '../../../providers/util-service/util-service';

@IonicPage({
  segment: 'import/livingcookbook',
  priority: 'low'
})
@Component({
  selector: 'page-import-livingcookbook',
  templateUrl: 'import-livingcookbook.html',
  providers: [ ]
})
export class ImportLivingcookbookPage {

  loading = null;
  imageFile = null;

  constructor(
    public navCtrl: NavController,
    public loadingService: LoadingServiceProvider,
    public toastCtrl: ToastController,
    public recipeService: RecipeServiceProvider,
    public utilService: UtilServiceProvider,
    public navParams: NavParams) {
  }

  setFile(event) {
    let files = event.srcElement.files
    if (!files) {
      return
    }

    this.imageFile = files[0];
  }

  filePicker() {
    document.getElementById('filePicker').click();
  }

  filePickerText() {
    if (this.imageFile) {
      return this.imageFile.name + ' Selected';
    } else {
      return 'Choose .lcb file';
    }
  }

  isFileTooLarge() {
    if (this.imageFile && this.imageFile.size / 1024 / 1024 > 350) {
      // File is larger than 350MB
      return true;
    }
    return false;
  }

  showFileTypeWarning() {
    if (!this.imageFile || !this.imageFile.name) return false
    return !this.imageFile.name.toLowerCase().endsWith('.lcb')
  }

  presentToast(msg) {
    this.toastCtrl.create({
      message: msg,
      duration: 6000
    }).present();
  }

  submit() {
    this.loading = this.loadingService.start();

    this.recipeService.importLCB(this.imageFile).subscribe(response => {
      this.loading.dismiss();
      this.loading = null;

      this.presentToast('Import was successful!')

      this.navCtrl.setRoot('HomePage', { folder: 'main' }, { animate: true, direction: 'forward' });
    }, err => {
      switch (err.status) {
        case 0:
          this.loading.dismiss();
          this.loading = null;
          this.presentToast(this.utilService.standardMessages.offlinePushMessage)
          break;
        case 401:
          this.loading.dismiss();
          this.loading = null;
          this.navCtrl.setRoot('LoginPage', {}, { animate: true, direction: 'forward' });
          break;
        case 504:
          setTimeout(() => {
            this.loading.dismiss();
            this.loading = null;
            this.presentToast("The import is taking a while (this can happen if your database is very large) - please check back in 5 minutes. If your recipes do not appear, please send me an email.");
            this.navCtrl.setRoot('HomePage', { folder: 'main' }, { animate: true, direction: 'forward' });
          }, 20000);
          break;
        default:
          this.loading.dismiss();
          this.loading = null;
          this.presentToast(this.utilService.standardMessages.unexpectedError);
          break;
      }
    });
  }
}
