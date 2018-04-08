import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, AlertController, LoadingController, ToastController, ModalController } from 'ionic-angular';

import { RecipeServiceProvider, Recipe } from '../../providers/recipe-service/recipe-service';
import { LabelServiceProvider } from '../../providers/label-service/label-service';

import * as moment from 'moment';
import fractionjs from 'fraction.js';

var $ = (<any>window).$;

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
  
  existingLabels: any = [];
  existingLabelsByTitle: any = {};
  selectedLabels: any = [];
  
  select2: any;
  
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
      me.existingLabels = response;
      
      me.existingLabels.sort(function(a, b) {
        if (a.recipes.length === b.recipes.length) return 0;
        return a.recipes.length > b.recipes.length ? -1 : 1;
      });
      
      for(var i = 0; i < me.existingLabels.length; i++) {
        if (me.existingLabels[i].recipes.indexOf(me.recipeId) > -1) {
          me.selectedLabels.push(me.existingLabels[i].title);
        }
        
        me.existingLabelsByTitle[me.existingLabels[i].title] = me.existingLabels[i];
      }
      
      me.reloadSelect2.call(me);
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
  
  loadSelect2() {
    var me = this;
    var labels = me.existingLabels.map(function(el) {
      return {
        id: el._id,
        text: el.title
      };
    });
    
    function formatLabelSelectItem(state) {
      if (!state.id) {
        return state.text;
      }
  
      var hintEl;
      if (me.existingLabelsByTitle[state.text]) {
        hintEl = '<span class="result-hint">Click to add</span>';
      } else {
        hintEl = '<span class="result-hint">Click to create</span>';
      }
  
      var $state = $(
        '<span>' + state.text + '</span>' + hintEl
      );
      return $state;
    }
    
    console.log(labels)
    
    me.select2 = $('#labelSelect').select2({
      placeholder: 'Type to select labels',
      tags: true,
      width: '100%',
      templateResult: formatLabelSelectItem,
      // allowClear: true,
      data: labels,
      dropdownParent: $('#labelSelectParent')
    }).on('select2:selecting', function (e) {
      var labelTitle = e.params.args.data.text;
      console.log(e);
      me.addLabel(labelTitle);
      e.preventDefault();
    }).on('select2:unselecting', function (e) {
      var labelTitle = e.params.args.data.text;
      console.log(labelTitle);
      me.deleteLabel(me.existingLabelsByTitle[labelTitle]);
      e.preventDefault();
    });
    
    var select = me.selectedLabels.map(function(el) {
      return me.existingLabelsByTitle[el]._id;
    });
    console.log(select)
    me.select2.val(select).trigger('change');
  }
  
  destroySelect2() {
    this.select2.off('select2:selecting');
    this.select2.off('select2:unselecting');
    this.select2.select2('destroy');
  }
  
  reloadSelect2() {
    this.destroySelect2.call(this);
    // Clean up all select2 fake elements
    $('#labelSelect option').not('option[id]').remove();
    this.loadSelect2.call(this);
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad RecipePage');
    
    this.loadSelect2();
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
  
  addLabel(title) {
    if (this.selectedLabels.indexOf(title) > -1) {
      this.reloadSelect2.call(this);
      return;
    }

    if (title.length === 0) {
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
      title: title.toLowerCase()
    }).subscribe(function(response) {
      loading.dismiss();
      
      if (!me.recipe.labels) me.recipe.labels = [];
      if (me.recipe.labels.indexOf(response) === -1) me.recipe.labels.push(response);
      if (me.selectedLabels.indexOf(response.title) === -1) me.selectedLabels.push(response.title);
      
      if (!me.existingLabelsByTitle[response.title]) {
        me.existingLabels.push(response);
        me.existingLabelsByTitle[response.title] = response;
      }
      
      setTimeout(function() { me.reloadSelect2.call(me); });
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
      
      var idx = me.recipe.labels.indexOf(response._id);
      me.recipe.labels.splice(idx, 1);
      
      idx = me.selectedLabels.indexOf(label.title);
      me.selectedLabels.splice(idx, 1);

      if(label.recipes.length === 1 && label.recipes[0] === me.recipeId) {
        idx = me.existingLabels.indexOf(label);
        me.existingLabels.splice(idx, 1);
        
        delete me.existingLabelsByTitle[label.title];
      } else {
        label.recipes = response.recipes;
      }
      
      me.reloadSelect2.call(me);
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
