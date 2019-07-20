import { Component } from '@angular/core';
import { NavController, ToastController } from '@ionic/angular';

import { LoadingService } from '@/services/loading.service';
import { RecipeService } from '@/services/recipe.service';
import { UtilService, RouteMap } from '@/services/util.service';

@Component({
  selector: 'page-import-paprika',
  templateUrl: 'import-paprika.page.html',
  styleUrls: ['import-paprika.page.scss']
})
export class ImportPaprikaPage {

  loading = null;
  imageFile = null;

  ignoreLargeFiles: boolean;

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
      return 'Choose .paprikarecipes file';
    }
  }

  isFileTooLarge() {
    if (!this.ignoreLargeFiles && this.imageFile && this.imageFile.size / 1024 / 1024 > 550) {
      // File is larger than 550MB
      return true;
    }
    return false;
  }

  showFileTypeWarning() {
    if (!this.imageFile || !this.imageFile.name) return false
    return !this.imageFile.name.toLowerCase().endsWith('.paprikarecipes')
  }

  async presentToast(msg: string) {
    (await this.toastCtrl.create({
      message: msg,
      duration: 6000
    })).present();
  }

  submit() {
    this.loading = this.loadingService.start();

    this.recipeService.importPaprika(this.imageFile).then(response => {
      this.loading.dismiss();
      this.loading = null;

      this.presentToast('Import was successful!')

      this.navCtrl.navigateRoot(RouteMap.HomePage.getPath('main'));
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
          this.navCtrl.navigateRoot(RouteMap.LoginPage.getPath());
          break;
        case 406:
          this.loading.dismiss();
          this.loading = null;
          (await this.toastCtrl.create({
            message: "Hmm, we had trouble extracting that file. Please make sure it is in Paprika Recipe Format directly from the app. If you're having trouble, please feel free to send me an email.",
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
            this.navCtrl.navigateRoot(RouteMap.HomePage.getPath('main'));
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
