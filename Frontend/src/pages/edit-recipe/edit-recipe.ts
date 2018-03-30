import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, LoadingController, ToastController } from 'ionic-angular';

import { RecipeServiceProvider, Recipe } from '../../providers/recipe-service/recipe-service';

import loadImage from 'blueimp-load-image';

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

    let loading = this.loadingCtrl.create({
      content: 'Saving your recipe...'
    });
  
    loading.present();

    if (this.recipe._id) {
      this.recipeService.update(this.recipe).subscribe(function(response) {
        loading.dismiss();

        // Remove the recipe list page (old version) AND the recipe edit page from the stack
        me.navCtrl.push('RecipePage', {
          recipe: response,
          recipeId: response._id
        }).then(() => {
          const startIndex = me.navCtrl.getActive().index - 2;
          if (startIndex < 0) return;
          me.navCtrl.remove(startIndex, 2);
        });
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
        
        // Remove the recipe create page from the stack
        me.navCtrl.push('RecipePage', {
          recipe: response,
          recipeId: response._id
        }).then(() => {
          const startIndex = me.navCtrl.getActive().index - 1;
          if (startIndex < 0) return;
          me.navCtrl.remove(startIndex, 1);
        });
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
