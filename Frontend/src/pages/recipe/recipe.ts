import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, AlertController, LoadingController, ToastController } from 'ionic-angular';

import { RecipeServiceProvider, Recipe } from '../../providers/recipe-service/recipe-service';
import { LabelServiceProvider } from '../../providers/label-service/label-service';

import * as moment from 'moment';
import fractionjs from 'fraction.js';

@IonicPage({
  segment: 'recipe/:recipeId',
})
@Component({
  selector: 'page-recipe',
  templateUrl: 'recipe.html',
  providers: [ RecipeServiceProvider, LabelServiceProvider ]
})
export class RecipePage {

  recipe: Recipe;
  recipeId: string;
  ingredients: any;
  instructions: string[];
  
  scale: number = 1;
  
  newLabel: string = '';

  constructor(
    public navCtrl: NavController,
    public alertCtrl: AlertController,
    public toastCtrl: ToastController,
    public loadingCtrl: LoadingController,
    public navParams: NavParams,
    public recipeService: RecipeServiceProvider,
    public labelService: LabelServiceProvider) {
      
    this.recipeId = navParams.get('recipeId');
    this.recipe = navParams.get('recipe') || <Recipe>{};
    
    if (this.recipe.instructions && this.recipe.instructions.length > 0) {
      this.instructions = this.recipe.instructions.split(/\r?\n/); 
    }

    // if (!this.recipe._id) {
    this.loadRecipe();
    // }
    
    this.applyScale();
  }
  
  loadRecipe() {
    var me = this;
    
    let loading = this.loadingCtrl.create({
      content: 'Loading recipes...'
    });
  
    loading.present();
    
    this.recipeService.fetchById(this.recipeId).subscribe(function(response) {
      loading.dismiss();

      me.recipe = response;
      
      if (me.recipe.instructions && me.recipe.instructions.length > 0) {
        me.instructions = me.recipe.instructions.split(/\r?\n/); 
      }
      
      me.applyScale();
    }, function(err) {
      loading.dismiss();

      switch(err.status) {
        case 401:
          me.navCtrl.setRoot('LoginPage', {}, {animate: true, direction: 'forward'});
          break;
        default:
          let errorToast = me.toastCtrl.create({
            message: 'An unexpected error occured. Please restart application.',
            duration: 30000
          });
          errorToast.present();
          break;
      }
    });
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
    
    // var measurementRegexp = /\d+(.\d+(.\d+)?)?/;
    var measurementRegexp = /((\d+ )?\d+([\/\.]\d+)?((-)|( to )|( - ))(\d+ )?\d+([\/\.]\d+)?)|((\d+ )?\d+[\/\.]\d+)|\d+/;
    
    for (var i = 0; i < lines.length; i++) {
      var matches = lines[i].match(measurementRegexp);
      if (!matches || matches.length === 0) continue;
      
      var measurement = matches[0];
      
      try {
        var measurementParts = measurement.split(/-|to/);
        
        for (var j = 0; j < measurementParts.length; j++) {
          // console.log(measurementParts[j].trim())
          var scaledMeasurement = fractionjs(measurementParts[j].trim()).mul(this.scale);

          // Preserve original fraction format if entered
          if (measurementParts[j].indexOf('/') > -1) {
            scaledMeasurement = scaledMeasurement.toFraction(true);
          }
          
          measurementParts[j] = '<b>' + scaledMeasurement + '</b>';
        }
        
        lines[i] = lines[i].replace(measurementRegexp, measurementParts.join(' to '));
      } catch(e) {
        console.log("failed to parse", e)
      }
    }
    
    this.ingredients = lines;
  }
  
  editRecipe() {
    this.navCtrl.push('EditRecipePage', {
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
      
      me.navCtrl.setRoot('HomePage', {}, {animate: true, direction: 'forward'});
    }, function(err) {
      loading.dismiss();
      switch(err.status) {
        case 401:
          me.toastCtrl.create({
            message: 'You are not authorized for this action! If you believe this is in error, please logout and login using the side menu.',
            duration: 6000
          }).present();
          break;
        case 404:
          me.toastCtrl.create({
            message: 'Can\'t find the recipe you\'re trying to delete.',
            duration: 6000
          }).present();
          break;
        default:
          me.toastCtrl.create({
            message: 'An unexpected error occured. Please try again.',
            duration: 6000
          }).present();
          break;
      }
    });
  }
  
  printRecipe() {
    window.print();
  }
  
  shareRecipe() {
    let errorToast = this.toastCtrl.create({
      message: 'Coming soon!',
      duration: 4000
    });
    errorToast.present();
  }
  
  labelFieldKeydown(event) {
    if (event.keyCode === 13) {
      this.addLabel();
    }
  }
  
  labelFieldSubmit() {
    this.addLabel();
  }
  
  addLabel() {
    if (this.newLabel.length === 0) {
      this.toastCtrl.create({
        message: 'Please enter a label and press enter to label this recipe.',
        duration: 6000
      }).present();
      return;
    }
    
    var me = this;
    
    let loading = this.loadingCtrl.create({
      content: 'Adding label...'
    });
  
    loading.present();

    this.labelService.create({
      recipeId: this.recipe._id,
      title: this.newLabel
    }).subscribe(function(response) {
      loading.dismiss();
      
      if (!me.recipe.labels) me.recipe.labels = [];
      me.recipe.labels.push(response);
      
      me.newLabel = '';
    }, function(err) {
      loading.dismiss();
      switch(err.status) {
        case 401:
          me.toastCtrl.create({
            message: 'You are not authorized for this action! If you believe this is in error, please logout and login using the side menu.',
            duration: 6000
          }).present();
          break;
        case 404:
          me.toastCtrl.create({
            message: 'Can\'t find the recipe you\'re trying to add a label to. Please try again or reload this recipe page.',
            duration: 6000
          }).present();
          break;
        default:
          me.toastCtrl.create({
            message: 'An unexpected error occured. Please try again.',
            duration: 6000
          }).present();
          break;
      }
    });
  }
  
  deleteLabel(label) {
    let alert = this.alertCtrl.create({
      title: 'Confirm Delete',
      message: 'This will permanently delete the label "' + label.title + '" from this recipe. This action is irreversible.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => {}
        },
        {
          text: 'Delete',
          handler: () => {
            this._deleteLabel(label);
          }
        }
      ]
    });
    alert.present();
  }
  
  private _deleteLabel(label) {
    var me = this;
    
    let loading = this.loadingCtrl.create({
      content: 'Deleting label...'
    });
  
    loading.present();
    
    console.log(label)
    
    label.recipeId = this.recipe._id;

    this.labelService.remove(label).subscribe(function(response) {
      loading.dismiss();
      
      var idx = me.recipe.labels.indexOf(label);
      me.recipe.labels.splice(idx, 1);
    }, function(err) {
      loading.dismiss();
      switch(err.status) {
        case 404:
          me.toastCtrl.create({
            message: 'Can\'t find the recipe you\'re trying to delete a label from. Please try again or reload this recipe page.',
            duration: 6000
          }).present();
          break;
        default:
          me.toastCtrl.create({
            message: 'An unexpected error occured. Please try again.',
            duration: 6000
          }).present();
          break;
      }
    });
  }
  
  prettyDateTime(datetime) {
    return moment(datetime).format('MMMM Do YYYY, h:mm:ss a');
  }
}
