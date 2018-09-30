import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ToastController } from 'ionic-angular';

import { RecipeServiceProvider, Recipe } from '../../../providers/recipe-service/recipe-service';
import { LoadingServiceProvider } from '../../../providers/loading-service/loading-service';

import loadImage from 'blueimp-load-image';
import { UtilServiceProvider } from '../../../providers/util-service/util-service';

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
    public utilService: UtilServiceProvider,
    public loadingService: LoadingServiceProvider,
    public recipeService: RecipeServiceProvider) {
    // this.recipe = <Recipe>{};
    this.recipe = navParams.get('recipe') || <Recipe>{};
  }

  ionViewDidLoad() {}

  ionViewWillEnter() {
    var textAreas = document.getElementsByTagName('textarea');
    for (var i = 0; i < textAreas.length; i++) {
      textAreas[i].style.height = textAreas[i].scrollHeight + 'px';
    }
  }

  updateTextAreaSize(event) {
    var el = event._elementRef.nativeElement.children[0];
    el.style.height = el.scrollHeight + 'px';
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

    if (this.recipe.id) {
      this.recipeService.update(this.recipe).subscribe(function(response) {
        loading.dismiss();

        me.navCtrl.setRoot('HomePage', { folder: 'main' }, {});
        me.navCtrl.push('RecipePage', {
          recipe: response,
          recipeId: response.id
        });
      }, function(err) {
        loading.dismiss();
        switch(err.status) {
          case 0:
            me.toastCtrl.create({
              message: me.utilService.standardMessages.offlinePushMessage,
              duration: 5000
            }).present();
            break;
          case 401:
            me.toastCtrl.create({
              message: me.utilService.standardMessages.unauthorized,
              duration: 6000
            }).present();
            break;
          default:
            me.toastCtrl.create({
              message: me.utilService.standardMessages.unexpectedError,
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
          recipeId: response.id
        });
      }, function(err) {
        loading.dismiss();
        switch(err.status) {
          case 0:
            me.toastCtrl.create({
              message: me.utilService.standardMessages.offlinePushMessage,
              duration: 5000
            }).present();
            break;
          case 401:
            me.toastCtrl.create({
              message: me.utilService.standardMessages.unauthorized,
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
              message: me.utilService.standardMessages.unexpectedError,
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
