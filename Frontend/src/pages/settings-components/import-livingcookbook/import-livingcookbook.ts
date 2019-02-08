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

  imageFile = null

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

  presentToast(msg) {
    this.toastCtrl.create({
      message: msg,
      duration: 6000
    }).present();
  }

  submit() {
    var loading = this.loadingService.start();

    this.recipeService.importLCB(this.imageFile).subscribe(response => {
      loading.dismiss();

      this.presentToast('Import was successful!')

      this.navCtrl.setRoot('HomePage', { folder: 'main' }, { animate: true, direction: 'forward' });
    }, err => {
      loading.dismiss();
      switch (err.status) {
        case 0:
          this.presentToast(this.utilService.standardMessages.offlinePushMessage)
          break;
        case 401:
          this.navCtrl.setRoot('LoginPage', {}, { animate: true, direction: 'forward' });
          break;
        default:
          this.presentToast(this.utilService.standardMessages.unexpectedError)
          break;
      }
    });
  }
}
