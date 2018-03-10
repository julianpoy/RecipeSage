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
    
    console.log("hi1", files[0])
    
    this.recipe.imageFile = files[0];
    
    var me = this;
    var loadingImage = loadImage(
        files[0],
        function (renderedCanvas, exif) {
          var dataURL = renderedCanvas.toDataURL(me.recipe.imageFile.type, 0.5);
          var blob = <any>me.dataURItoBlob(dataURL);
          blob.name = me.recipe.imageFile.name;
          me.recipe.imageFile = blob;
        },
        {
          maxWidth: 200,
          orientation: true,
          canvas: false
        }
    );
    // loadingImage.onload =
    loadingImage.onerror = function(err, err2) {
      console.log(err, err2)
    };
    console.log("hi55")
  }
  
  dataURItoBlob(dataURI) {
    // convert base64/URLEncoded data component to raw binary data held in a string
    var byteString;
    if (dataURI.split(',')[0].indexOf('base64') >= 0)
        byteString = atob(dataURI.split(',')[1]);
    else
        byteString = unescape(dataURI.split(',')[1]);

    // separate out the mime component
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    // write the bytes of the string to a typed array
    var ia = new Uint8Array(byteString.length);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ia], {type:mimeString});
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
