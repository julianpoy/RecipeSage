import { Component } from '@angular/core';
import { NavController, ToastController, AlertController } from '@ionic/angular';

import { RecipeService } from '@/services/recipe.service';
import { LoadingService } from '@/services/loading.service';
import { UtilService, RouteMap } from '@/services/util.service';

@Component({
  selector: 'page-import-pepperplate',
  templateUrl: 'import-pepperplate.page.html',
  styleUrls: ['import-pepperplate.page.scss'],
  providers: [ RecipeService ]
})
export class ImportPepperplatePage {
  defaultBackHref: string = RouteMap.ImportPage.getPath();

  username = '';
  password = '';

  errorMessage = '';

  loading = false;

  constructor(
    public navCtrl: NavController,
    public loadingService: LoadingService,
    public toastCtrl: ToastController,
    public alertCtrl: AlertController,
    public utilService: UtilService,
    public recipeService: RecipeService) {
  }


  async scrapePepperplate() {
    if (this.username.trim().length === 0) {
      this.errorMessage = 'Please enter your pepperplate email/username.';
      return;
    }

    if (this.password.trim().length === 0) {
      this.errorMessage = 'Please enter your pepperplate password.';
      return;
    }

    const loading = this.loadingService.start();

    this.loading = true;

    this.recipeService.scrapePepperplate({
      username: this.username,
      password: this.password
    }).then(async response => {
      this.loading = false;
      loading.dismiss();

      this.navCtrl.navigateRoot(RouteMap.HomePage.getPath('main'));

      (await this.toastCtrl.create({
        message: "Import complete!",
        showCloseButton: true
      })).present();

    }).catch(async err => {
      this.loading = false;
      loading.dismiss();
      switch (err.response.status) {
        case 0:
          (await this.toastCtrl.create({
            message: this.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          })).present();
          break;
        case 401:
          (await this.toastCtrl.create({
            message: this.utilService.standardMessages.unauthorized,
            duration: 6000
          })).present();
          break;
        case 406:
          (await this.toastCtrl.create({
            message: "Pepperplate rejected those credentials. Please try again.",
            duration: 6000
          })).present();
          break;
        case 504:
          setTimeout(async () => {
            const longTimeAlert = await this.alertCtrl.create({
              header: 'This is taking a little longer than expected',
              message: `This can happen when Pepperplate is under heavy load. The import is still in progress. If you don't see your recipes appear, feel free to email me.`,
              buttons: [
                {
                  text: 'Dismiss',
                  handler: () => {}
                }
              ]
            });
      
            longTimeAlert.present();
          }, 20000);
          break;
        default:
          (await this.toastCtrl.create({
            message: this.utilService.standardMessages.unexpectedError,
            duration: 6000
          })).present();
          break;
      }
    });
  }

}
