import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, AlertController, LoadingController, ToastController, ModalController } from 'ionic-angular';

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
  
  labelObjectsByTitle: any = {};
  existingLabels: any = [];
  selectedLabels: any = [];
  
  constructor(
    public navCtrl: NavController,
    public alertCtrl: AlertController,
    public toastCtrl: ToastController,
    public modalCtrl: ModalController,
    public loadingCtrl: LoadingController,
    public navParams: NavParams,
    public recipeService: RecipeServiceProvider,
    public labelService: LabelServiceProvider) {
      
    this.recipeId = navParams.get('recipeId');
    this.recipe = <Recipe>{};

    this.applyScale();
  }
  
  ionViewWillEnter() {
    let loading = this.loadingCtrl.create({
      content: 'Loading recipe...'
    });
  
    loading.present();
    
    this.recipe = <Recipe>{};
    // if (!this.recipe._id) {
    this.loadRecipe().then(function() {
      loading.dismiss();
    }, function() {
      loading.dismiss();
    });
    // }
    
    this.loadLabels();
  }
  
  refresh(loader) {
    this.loadRecipe().then(function() {
      loader.complete();
    }, function() {
      loader.complete();
    });
  }
  
  loadRecipe() {
    var me = this;
    
    return new Promise(function(resolve, reject) {
      me.recipeService.fetchById(me.recipeId).subscribe(function(response) {
        me.recipe = response;
        
        if (me.recipe.instructions && me.recipe.instructions.length > 0) {
          me.instructions = me.recipe.instructions.split(/\r?\n/); 
        }
        
        me.applyScale();
        
        resolve();
      }, function(err) {
        switch(err.status) {
          case 401:
            me.navCtrl.setRoot('LoginPage', {}, {animate: true, direction: 'forward'});
            break;
          case 404:
            let errorToast = me.toastCtrl.create({
              message: 'Recipe not found. Does this recipe URL exist?',
              duration: 30000,
              dismissOnPageChange: true
            });
            errorToast.present();
            break;
          default:
            errorToast = me.toastCtrl.create({
              message: 'An unexpected error occured. Please restart application.',
              duration: 30000
            });
            errorToast.present();
            break;
        }
        
        reject();
      });
    });
  }
  
  loadLabels() {
    var me = this;
    this.labelService.fetch().subscribe(function(response) {
      for (var i = 0; i < response.length; i++) {
        var label = response[i];
        me.existingLabels.push(label.title);
        me.labelObjectsByTitle[label.title] = label;
        
        if (label.recipes.indexOf(me.recipeId) > -1) {
          me.selectedLabels.push(label.title);
        }
      }

      me.existingLabels.sort(function(a, b) {
        if (me.labelObjectsByTitle[a].recipes.length === me.labelObjectsByTitle[b].recipes.length) return 0;
        return me.labelObjectsByTitle[a].recipes.length > me.labelObjectsByTitle[b].recipes.length ? -1 : 1;
      });
    }, function(err) {
      switch(err.status) {
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
    
    scale = parseFloat(scale) || 1;
    
    this.scale = scale;

    var me = this;
    setTimeout(function() {
      me.applyScale();
    }, 0);
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

      me.navCtrl.setRoot('HomePage', { folder: me.recipe.folder }, {animate: true, direction: 'forward'});
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
    // let errorToast = this.toastCtrl.create({
    //   message: 'Coming soon!',
    //   duration: 4000
    // });
    // errorToast.present();
    
    let shareModal = this.modalCtrl.create('ShareModalPage', { recipe: this.recipe });
    shareModal.present();
  }
  
  moveToFolder(folderName) {
    var me = this;
    
    let loading = this.loadingCtrl.create({
      content: 'Loading...'
    });
  
    loading.present();
    
    this.recipe.folder = folderName;
    
    console.log(this.recipe)

    this.recipeService.update(this.recipe).subscribe(function(response) {
      loading.dismiss();
      
      me.navCtrl.setRoot('RecipePage', {
        recipe: response,
        recipeId: response._id
      }, {animate: true, direction: 'forward'});
    }, function(err) {
      loading.dismiss();
      switch(err.status) {
        case 401:
          me.toastCtrl.create({
            message: 'You are not authorized for this action! If you believe this is in error, please logout and login using the side menu.',
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
  
  labelMatch(value, target) {
    return target.display.toLowerCase().indexOf(value.toLowerCase()) > -1;
    // return true;
  }
  
  onLabelAdded(e) {
    var title = e.display;

    // if (this.existingLabels.indexOf(title) === -1) this.existingLabels.push(title);
    
    this.addLabel(title);
  }
  
  onLabelRemoved(e) {
    var title = e.display || e;
    var label = this.labelObjectsByTitle[title];

    if (label) {
      this.deleteLabel(label);
    }
  }
  
  addLabel(title) {
    if (title.length === 0) {
      this.toastCtrl.create({
        message: 'Please enter a label and press enter to label this recipe.',
        duration: 6000
      }).present();
      return;
    }
    
    var me = this;
    
    let loading = this.loadingCtrl.create({
      content: 'Adding label...',
      dismissOnPageChange: true
    });
  
    loading.present();

    this.labelService.create({
      recipeId: this.recipe._id,
      title: title.toLowerCase()
    }).subscribe(function(response) {
      loading.dismiss();
      
      if (!me.recipe.labels) me.recipe.labels = [];
      if (me.recipe.labels.indexOf(response) === -1) me.recipe.labels.push(response);
 
      me.labelObjectsByTitle[response.title] = response;
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
          handler: () => {
            this.selectedLabels.push(label.title);
          }
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
      content: 'Deleting label...',
      dismissOnPageChange: true
    });
  
    loading.present();
    
    label.recipeId = this.recipe._id;

    this.labelService.remove(label).subscribe(function(response) {
      loading.dismiss();
      
      if(label.recipes.length === 1 && label.recipes[0] === me.recipeId) {
        var i = me.existingLabels.indexOf(label.title);
        me.existingLabels.splice(i, 1);
        delete me.labelObjectsByTitle[label.title];
      } else {
        label.recipes = response.recipes;
      }

      var idx = me.recipe.labels.indexOf(response);
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
