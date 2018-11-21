import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ToastController } from 'ionic-angular';

import { RecipeServiceProvider } from '../../../providers/recipe-service/recipe-service';
import { LoadingServiceProvider } from '../../../providers/loading-service/loading-service';
import { UtilServiceProvider } from '../../../providers/util-service/util-service';

@IonicPage({
  priority: 'low'
})
@Component({
  selector: 'page-import',
  templateUrl: 'import.html',
  providers: [ RecipeServiceProvider ]
})
export class ImportPage {

  username: string = '';
  password: string = '';

  errorMessage: string = '';

  constructor(
    public navCtrl: NavController,
    public loadingService: LoadingServiceProvider,
    public toastCtrl: ToastController,
    public utilService: UtilServiceProvider,
    public recipeService: RecipeServiceProvider,
    public navParams: NavParams) {
  }

  ionViewDidLoad() {}

  scrapePepperplate() {
    if (this.username.trim().length === 0) {
      this.errorMessage = 'Please enter your pepperplate email/username.';
      return;
    }

    if (this.password.trim().length === 0) {
      this.errorMessage = 'Please enter your pepperplate password.';
      return;
    }

    var loading = this.loadingService.start();

    this.recipeService.scrapePepperplate({
      username: this.username,
      password: this.password
    }).subscribe(response => {
      loading.dismiss();

      this.toastCtrl.create({
        message: 'We\'ll start importing your recipes shortly! We\'ll alert you when the process begins.',
        duration: 6000
      }).present();

      this.navCtrl.setRoot('HomePage', { folder: 'main' }, {animate: true, direction: 'forward'});
    }, err => {
      loading.dismiss();
      switch(err.status) {
        case 0:
          this.toastCtrl.create({
            message: this.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          }).present();
          break;
        case 401:
          this.toastCtrl.create({
            message: this.utilService.standardMessages.unauthorized,
            duration: 6000
          }).present();
          break;
        default:
          this.toastCtrl.create({
            message: this.utilService.standardMessages.unexpectedError,
            duration: 6000
          }).present();
          break;
      }
    });
  }

}
