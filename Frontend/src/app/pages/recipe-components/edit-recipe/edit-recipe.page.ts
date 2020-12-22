import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { NavController, ToastController, AlertController, LoadingController } from '@ionic/angular';

import { UtilService, RouteMap } from '@/services/util.service';
import { RecipeService, Recipe } from '@/services/recipe.service';
import { LoadingService } from '@/services/loading.service';
import { UnsavedChangesService } from '@/services/unsaved-changes.service';
import { CapabilitiesService } from '@/services/capabilities.service';
import { ImageService } from '@/services/image.service';

@Component({
  selector: 'page-edit-recipe',
  templateUrl: 'edit-recipe.page.html',
  styleUrls: ['edit-recipe.page.scss'],
  providers: [ RecipeService ]
})
export class EditRecipePage {

  defaultBackHref: string;

  recipeId: string;
  recipe: Recipe = {} as Recipe;

  imageBlobURL: any;
  images: any[] = [];

  constructor(
    public route: ActivatedRoute,
    public navCtrl: NavController,
    public toastCtrl: ToastController,
    public alertCtrl: AlertController,
    public utilService: UtilService,
    public unsavedChangesService: UnsavedChangesService,
    public loadingCtrl: LoadingController,
    public loadingService: LoadingService,
    public recipeService: RecipeService,
    public imageService: ImageService,
    public domSanitizationService: DomSanitizer,
    public capabilitiesService: CapabilitiesService) {

    const recipeId = this.route.snapshot.paramMap.get('recipeId');

    if (recipeId !== 'new') {
      this.recipeId = recipeId;

      const loading = this.loadingService.start();
      this.recipeService.fetchById(this.recipeId).then(recipe => {
        this.recipe = recipe;
        this.images = recipe.images;
        loading.dismiss();
      }).catch(async err => {
        loading.dismiss();
        switch (err.response.status) {
          case 0:
            const offlineToast = await this.toastCtrl.create({
              message: this.utilService.standardMessages.offlinePushMessage,
              duration: 5000
            });
            offlineToast.present();
            break;
          case 401:
            this.goToAuth();
            break;
          case 404:
            const notFoundToast = await this.toastCtrl.create({
              message: 'Recipe not found. Does this recipe URL exist?',
              duration: 30000 // TODO: Should offer a dismiss button
            });
            notFoundToast.present();
            break;
          default:
            const unexpectedErrorToast = await this.toastCtrl.create({
              message: this.utilService.standardMessages.unexpectedError,
              duration: 6000
            });
            unexpectedErrorToast.present();
            break;
        }
      });
    }

    this.defaultBackHref = this.recipeId ? RouteMap.RecipePage.getPath(this.recipeId) : RouteMap.HomePage.getPath('main');
  }

  goToAuth(cb?: () => any) {
    // TODO: Needs functionality
  }

  async save() {
    if (!this.recipe.title || this.recipe.title.length === 0) {
      (await this.toastCtrl.create({
        message: 'Please provide a recipe title (the only required field).',
        duration: 6000
      })).present();
      return;
    }

    const loading = this.loadingService.start();

    if (this.recipe.id) {
      this.recipeService.update({
        ...this.recipe,
        imageIds: this.images.map(image => image.id)
      }).then(response => {
        this.markAsClean();

        this.navCtrl.navigateRoot(RouteMap.RecipePage.getPath(this.recipe.id));

        loading.dismiss();
      }).catch(async err => {
        loading.dismiss();
        switch (err.response.status) {
          case 0:
            (await this.toastCtrl.create({
              message: this.utilService.standardMessages.offlinePushMessage,
              duration: 5000
            })).present();
            break;
          case 401:
            (await this.toastCtrl.create({
              message: this.utilService.standardMessages.unauthorized,
              duration: 6000
            })).present();
            break;
          default:
            (await this.toastCtrl.create({
              message: this.utilService.standardMessages.unexpectedError,
              duration: 6000
            })).present();
            break;
        }
      });
    } else {
      this.recipeService.create({
        ...this.recipe,
        imageIds: this.images.map(image => image.id)
      }).then(response => {
        this.markAsClean();

        this.navCtrl.navigateRoot(RouteMap.RecipePage.getPath(response.id));

        loading.dismiss();
      }).catch(async err => {
        loading.dismiss();
        console.log(err)
        switch (err.response.status) {
          case 0:
            (await this.toastCtrl.create({
              message: this.utilService.standardMessages.offlinePushMessage,
              duration: 5000
            })).present();
            break;
          case 401:
            (await this.toastCtrl.create({
              message: this.utilService.standardMessages.unauthorized,
              duration: 6000
            })).present();
            break;
          case 412:
            (await this.toastCtrl.create({
              message: 'Please provide a recipe title (the only required field).',
              duration: 6000
            })).present();
            break;
          default:
            (await this.toastCtrl.create({
              message: this.utilService.standardMessages.unexpectedError,
              duration: 6000
            })).present();
            break;
        }
      });
    }
  }

  markAsDirty() {
    this.unsavedChangesService.setPendingChanges();
  }

  markAsClean() {
    this.unsavedChangesService.clearPendingChanges();
  }

  async clipFromUrl() {
    const clipPrompt = await this.alertCtrl.create({
      header: 'Autofill fields from URL',
      subHeader: 'Enter a website URL to grab recipe data',
      message: 'Note: This feature is in beta',
      inputs: [{
        name: 'url',
        type: 'text',
        placeholder: 'Recipe URL'
      }],
      buttons: [{
        text: 'Cancel',
        role: 'cancel',
      }, {
        text: 'Ok',
        handler: data => {
          this._clipFromUrl(data.url);
        }
      }]
    });

    await clipPrompt.present();
  }

  async _clipFromUrl(url: string) {
    const loading = await this.loadingCtrl.create({
      message: 'Please wait...'
    });
    await loading.present();
    try {
      const fields = await this.recipeService.clipFromUrl(url);
      console.log(fields);

      const autofillFields = ['title', 'description', 'source', 'yield', 'activeTime', 'totalTime', 'ingredients', 'instructions', 'notes'];
      autofillFields.forEach(fieldName => fields[fieldName] ? this.recipe[fieldName] = fields[fieldName] : null);

      this.recipe.url = url;

      if (fields.imageURL?.trim()) {
        try {
          const image = await this.imageService.createFromUrl(fields.imageURL);
          this.images.push(image);
        } catch(err) {
          console.log('Error clipping image:', err);
        }
      }
    } catch(err) {
      switch (err?.response?.status) {
        case 0:
          (await this.toastCtrl.create({
            message: this.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          })).present();
          break;
        case 400:
          (await this.toastCtrl.create({
            message: 'Failed to autofill from that URL',
            duration: 5000
          })).present();
          break;
        default:
          (await this.toastCtrl.create({
            message: this.utilService.standardMessages.unexpectedError,
            duration: 6000
          })).present();
          break;
      }
    }
    loading.dismiss();
  }
}
