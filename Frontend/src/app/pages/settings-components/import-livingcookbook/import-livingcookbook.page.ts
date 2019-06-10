import { Component } from '@angular/core';
import { NavController, ToastController } from '@ionic/angular';

import { LoadingService } from '@/services/loading.service';
import { RecipeService } from '@/services/recipe.service';
import { UtilService } from '@/services/util.service';

@Component({
  selector: 'page-import-livingcookbook',
  templateUrl: 'import-livingcookbook.page.html',
  styleUrls: ['import-livingcookbook.page.scss']
})
export class ImportLivingcookbookPage {

  loading = null;
  imageFile = null;

  ignoreLargeFiles: boolean;
  includeTechniques: boolean = false;
  includeStockRecipes: boolean = false;
  excludeImages: boolean = false;

  constructor(
    public navCtrl: NavController,
    public loadingService: LoadingService,
    public toastCtrl: ToastController,
    public recipeService: RecipeService,
    public utilService: UtilService) {

    this.ignoreLargeFiles = !!localStorage.getItem("largeFileOverride");
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

  isFileLargerThanMB(size: number) {
    if (this.imageFile && this.imageFile.size / 1024 / 1024 > size) {
      // File is larger than 350MB
      return true;
    }
    return false;
  }

  isFileLarge() {
    if (!this.ignoreLargeFiles) return this.isFileLargerThanMB(350);
    return false;
  }

  isFileTooLarge() {
    if (!this.ignoreLargeFiles) return this.isFileLargerThanMB(650);
    return false;
  }

  showFileTypeWarning() {
    if (!this.imageFile || !this.imageFile.name) return false
    return !this.imageFile.name.toLowerCase().endsWith('.lcb')
  }

  async presentToast(msg: string) {
    (await this.toastCtrl.create({
      message: msg,
      duration: 6000
    })).present();
  }

  submit() {
    this.loading = this.loadingService.start();

    this.recipeService.importLCB(this.imageFile, this.includeStockRecipes, this.includeTechniques, this.excludeImages).then(response => {
      this.loading.dismiss();
      this.loading = null;

      this.presentToast('Import was successful!')

      // this.navCtrl.setRoot('HomePage', { folder: 'main' }, { animate: true, direction: 'forward' });
    }).catch(async err => {
      switch (err.status) {
        case 0:
          this.loading.dismiss();
          this.loading = null;
          this.presentToast(this.utilService.standardMessages.offlinePushMessage)
          break;
        case 401:
          this.loading.dismiss();
          this.loading = null;
          // this.navCtrl.setRoot('LoginPage', {}, { animate: true, direction: 'forward' });
          break;
        case 406:
          this.loading.dismiss();
          this.loading = null;
          (await this.toastCtrl.create({
            message: "Hmm, we had trouble extracting that file. Please make sure it is in .lcb format. If you're having trouble, please feel free to send me an email.",
            showCloseButton: true,
            // dismissOnPageChange: true
          })).present();
          break;
        case 504:
          setTimeout(async () => {
            this.loading.dismiss();
            this.loading = null;
            (await this.toastCtrl.create({
              message: "The import is taking a while (this can happen if your database is very large) - please check back in 5 minutes. If your recipes do not appear, please send me an email.",
              showCloseButton: true
            })).present();
            // this.navCtrl.setRoot('HomePage', { folder: 'main' }, { animate: true, direction: 'forward' });
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
