import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, AlertController, LoadingController, ToastController } from 'ionic-angular';

import { EditRecipePage } from '../edit-recipe/edit-recipe';
import { HomePage } from '../home/home';
import { RecipeServiceProvider, Recipe } from '../../providers/recipe-service/recipe-service';

import * as moment from 'moment';
import fractionjs from 'fraction.js';

/**
 * Generated class for the RecipePage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-recipe',
  templateUrl: 'recipe.html',
  providers: [ RecipeServiceProvider ]
})
export class RecipePage {

  recipe: Recipe;
  ingredients: any;
  
  scale: Number;

  constructor(
    public navCtrl: NavController,
    public alertCtrl: AlertController,
    public toastCtrl: ToastController,
    public loadingCtrl: LoadingController,
    public navParams: NavParams,
    public recipeService: RecipeServiceProvider) {
    this.recipe = navParams.get('recipe') || <Recipe>{};
    
    this.scale = 1;
    
    this.applyScale();
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad RecipePage');
  }
  
  setScale(scale) {
    if (!scale || scale <= 0) scale = 1;
    
    scale = parseInt(scale) || 1;
    
    this.scale = scale;

    this.applyScale();
  }
  
  applyScale() {
    
    if (!this.recipe.ingredients) return;
    
    var lines = this.recipe.ingredients.match(/[^\r\n]+/g);
    
    var measurementRegexp = /\d+(.\d+(.\d+)?)?/;
    
    for (var i = 0; i < lines.length; i++) {
      var matches = lines[i].match(measurementRegexp);
      if (!matches || matches.length === 0) continue;
      
      var measurement = matches[0];
      
      var scaledMeasurement = fractionjs(measurement).mul(this.scale);

      // Preserve original fraction format if entered
      if (measurement.indexOf('/') > -1) {
        scaledMeasurement = scaledMeasurement.toFraction(true);
      }
      
      scaledMeasurement = '<b>' + scaledMeasurement + '</b>';
      
      lines[i] = lines[i].replace(measurementRegexp, scaledMeasurement);
    }
    
    this.ingredients = lines;
  }
  
  editRecipe() {
    this.navCtrl.push(EditRecipePage, {
      recipe: this.recipe
    });
  }
  
  deleteRecipe() {
    let alert = this.alertCtrl.create({
      title: 'Confirm Delete',
      message: 'This will permanently delete the recipe from your account. This action is irreversible.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => {}
        },
        {
          text: 'Delete',
          handler: () => {
            this._deleteRecipe();
          }
        }
      ]
    });
    alert.present();
  }
  
  private _deleteRecipe() {
    var me = this;
    
    let loading = this.loadingCtrl.create({
      content: 'Deleting this recipe...'
    });
  
    loading.present();
    
    this.recipeService.remove(this.recipe).subscribe(function(response) {
      loading.dismiss();
      
      me.navCtrl.setRoot(HomePage, {}, {animate: true, direction: 'forward'});
    }, function(err) {
      loading.dismiss();
      switch(err.status) {
        case 404:
          let errorToast = me.toastCtrl.create({
            message: 'Can\'t find the recipe you\'re trying to delete.',
            duration: 8000
          });
          errorToast.present();
          break;
        default:
          let errorToast = me.toastCtrl.create({
            message: 'An unexpected error occured. Please try again.',
            duration: 8000
          });
          errorToast.present();
          break;
      }
    });
  }
  
  prettyDateTime(datetime) {
    return moment(datetime).format('MMMM Do YYYY, h:mm:ss a');
  }
}
