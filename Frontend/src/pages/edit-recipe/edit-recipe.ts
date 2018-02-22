import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, LoadingController } from 'ionic-angular';

import { HomePage } from '../home/home';

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
  
  errorMessage: String;
  
  rawImageFile: any;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public loadingCtrl: LoadingController,
    public recipeService: RecipeServiceProvider) {
    // this.recipe = <Recipe>{};
    this.recipe = navParams.get('recipe') || <Recipe>{};
    
    this.errorMessage = '';
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad EditRecipePage');
    
    this.errorMessage = '';
  }
  
  setFile(event) {
    let files = event.srcElement.files
    if (!files) {
      return
    }
    
    this.recipe.imageFile = files[0];
  }
  
  save() {
    var me = this;
    this.errorMessage = '';
    
    let loading = this.loadingCtrl.create({
      content: 'Saving your recipe...'
    });
  
    loading.present();

    if (this.recipe._id) {
      this.recipeService.update(this.recipe).subscribe(function(response) {
        loading.dismiss();
        
        me.navCtrl.setRoot(HomePage, {}, {animate: true, direction: 'forward'});
      }, function(err) {
        loading.dismiss();
        switch(err.status) {
          case 401:
            me.errorMessage = 'That password doesn\'t match the email address you entered.';
            break;
          default:
            me.errorMessage = 'An unexpected error occured. Please try again.';
            break;
        }
      });
    } else {
      this.recipeService.create(this.recipe).subscribe(function(response) {
        loading.dismiss();
        
        me.navCtrl.setRoot(HomePage, {}, {animate: true, direction: 'forward'});
      }, function(err) {
        loading.dismiss();
        switch(err.status) {
          case 404:
            me.errorMessage = 'I can\'t find an account with that email address.';
            break;
          case 401:
            me.errorMessage = 'That password doesn\'t match the email address you entered.';
            break;
          default:
            me.errorMessage = 'An unexpected error occured. Please try again.';
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
