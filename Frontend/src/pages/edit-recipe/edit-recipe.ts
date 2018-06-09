import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ToastController } from 'ionic-angular';

import { RecipeServiceProvider, Recipe } from '../../providers/recipe-service/recipe-service';
import { LoadingServiceProvider } from '../../providers/loading-service/loading-service';

import loadImage from 'blueimp-load-image';

@IonicPage({
  priority: 'low'
})
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
    public loadingService: LoadingServiceProvider,
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
    
    var me = this;
    var loadingImage = loadImage(
        files[0],
        function (renderedCanvas, exif) {
          renderedCanvas.toBlob(function(myBlob) {
            myBlob.name = me.recipe.imageFile.name;
            me.recipe.imageFile = myBlob;
            
            console.log('Local conversion complete');
          }, 'image/jpeg', 1);
        },
        {
          maxWidth: 200,
          canvas: true,
          orientation: true
        }
    );

    loadingImage.onerror = function(err) {
      console.log('Local conversion failed', err)
    };
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
  
    var loading = this.loadingService.start();

    if (this.recipe._id) {
      this.recipeService.update(this.recipe).subscribe(function(response) {
        loading.dismiss();

        me.navCtrl.setRoot('HomePage', { folder: 'main' }, {});
        me.navCtrl.push('RecipePage', {
          recipe: response,
          recipeId: response._id
        });
      }, function(err) {
        loading.dismiss();
        switch(err.status) {
          case 0:
            me.toastCtrl.create({
              message: 'It looks like you\'re offline. While offline, all RecipeSage functions are read-only.',
              duration: 5000
            }).present();
            break;
          case 401:
            me.toastCtrl.create({
              message: 'You are not authorized for this action! If you believe this is in error, please log out and log in using the side menu.',
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
        
        me.navCtrl.setRoot('HomePage', { folder: 'main' }, {});
        me.navCtrl.push('RecipePage', {
          recipe: response,
          recipeId: response._id
        });
      }, function(err) {
        loading.dismiss();
        switch(err.status) {
          case 0:
            me.toastCtrl.create({
              message: 'It looks like you\'re offline. While offline, all RecipeSage functions are read-only.',
              duration: 5000
            }).present();
            break;
          case 401:
            me.toastCtrl.create({
              message: 'You are not authorized for this action! If you believe this is in error, please log out and log in using the side menu.',
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
