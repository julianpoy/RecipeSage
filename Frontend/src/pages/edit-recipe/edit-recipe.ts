import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, LoadingController, ToastController } from 'ionic-angular';

import { RecipeServiceProvider, Recipe } from '../../providers/recipe-service/recipe-service';

/**
 * Generated class for the EditRecipePage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-edit-recipe',
  templateUrl: 'edit-recipe.html',
  providers: [ RecipeServiceProvider ]
})
export class EditRecipePage {
  
  recipe: Recipe;
  
  rawImageFile: any;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public toastCtrl: ToastController,
    public loadingCtrl: LoadingController,
    public recipeService: RecipeServiceProvider) {
    // this.recipe = <Recipe>{};
    this.recipe = navParams.get('recipe') || <Recipe>{};
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad EditRecipePage');
  }
  
  setFile(event) {
    let files = event.srcElement.files
    if (!files) {
      return
    }
    
    this.recipe.imageFile = files[0];
  }
  
  save() {
    if (!this.recipe.title || this.recipe.title.length === 0) {
      this.toastCtrl.create({
        message: 'Please provide a recipe title (the only required field).',
        duration: 6000
      }).present();
      return;
    }
    
    var me = this;

    let loading = this.loadingCtrl.create({
      content: 'Saving your recipe...'
    });
  
    loading.present();

    if (this.recipe._id) {
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
    } else {
      this.recipeService.create(this.recipe).subscribe(function(response) {
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
          case 412:
            me.toastCtrl.create({
              message: 'Please provide a recipe title (the only required field).',
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
  }
  
  filePicker() {
    document.getElementById('filePicker').click();
  }
  
  filePickerText() {
    if (this.recipe.imageFile) {
      return this.recipe.imageFile.name + ' Selected';
    } else if (this.recipe.image) {
      return 'Choose new image';
    } else {
      return 'Choose image';
    }
  }

}
