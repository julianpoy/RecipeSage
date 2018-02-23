import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, LoadingController, ToastController } from 'ionic-angular';

import { HomePage } from '../home/home';
import { RecipeServiceProvider } from '../../providers/recipe-service/recipe-service';

@IonicPage()
@Component({
  selector: 'page-import',
  templateUrl: 'import.html',
  providers: [ RecipeServiceProvider ]
})
export class ImportPage {
  
  username: string;
  password: string;

  constructor(
    public navCtrl: NavController,
    public loadingCtrl: LoadingController,
    public toastCtrl: ToastController,
    public recipeService: RecipeServiceProvider,
    public navParams: NavParams) {
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad ImportPage');
  }
  
  scrapePepperplate() {
    var me = this;
    
    let loading = this.loadingCtrl.create({
      content: 'Starting import...'
    });
  
    loading.present();
    
    this.recipeService.scrapePepperplate({
      username: this.username,
      password: this.password
    }).subscribe(function(response) {
      loading.dismiss();
      
      me.toastCtrl.create({
        message: 'We\'ve started importing your recipes! This may take a few minutes, and you won\'t see anything added until we\'re done.',
        duration: 4000
      }).present();
      
      me.navCtrl.setRoot(HomePage, {}, {animate: true, direction: 'forward'});
    }, function(err) {
      loading.dismiss();
      switch(err.status) {
        default:
          me.toastCtrl.create({
            message: 'An unexpected error occured. Please try again.',
            duration: 4000
          }).present();
          break;
      }
    });
  }

}
