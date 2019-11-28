import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { NavController, ToastController } from '@ionic/angular';
import loadImage from 'blueimp-load-image';

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
    public utilService: UtilService,
    public unsavedChangesService: UnsavedChangesService,
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
        setTimeout(() => this.setInitialTextAreaSize());
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

  getScrollHeight(el) {
    // Math max to ensure text areas are at least 2 rows high
    return Math.max(el.scrollHeight + 1, 54);
  }

  setInitialTextAreaSize() {
    const textAreas = Array.from(document.getElementsByTagName('textarea'));
    for (const textArea of textAreas) {
      textArea.style.height = `${this.getScrollHeight(textArea)}px`;
    }
  }

  ionViewWillEnter() {
    this.setInitialTextAreaSize();
  }

  updateTextAreaSize(event) {
    const el = event.target.children[0];
    el.style.height = 'auto';
    el.style.height = `${this.getScrollHeight(el)}px`;
  }

  goToAuth(cb?: () => any) {
    // TODO: Needs functionality
  }

  convertImage(file) {
    const LOCAL_CONVERSION_WIDTH = 2048;
    const LOCAL_CONVERSION_HEIGHT = 2048;

    return new Promise((resolve, reject) => {
      const loadingImage = loadImage(
        file,
        (renderedCanvas, exif) => {
          renderedCanvas.toBlob(myBlob => {
            myBlob.name = file.name;
            resolve(myBlob);

            console.log('Local conversion complete');
          }, 'image/jpeg', 1);
        },
        {
          maxWidth: LOCAL_CONVERSION_WIDTH,
          maxHeight: LOCAL_CONVERSION_HEIGHT,
          crop: true,
          canvas: true,
          orientation: true
        }
      );

      loadingImage.onerror = err => {
        reject(err);
      };
    });
  }

  async addImage(event) {
    const files = event.srcElement.files;
    if (!files || !files[0]) {
      return;
    }

    if (this.images.length + files.length > 10) {
      const imageUploadTooManyToast = await this.toastCtrl.create({
        message: 'You can attach attach up to 10 images to a recipe',
        showCloseButton: true
      });
      imageUploadTooManyToast.present();
      return;
    }

    const loading = this.loadingService.start();

    const MAX_FILE_SIZE_MB = 8;

    try {
      await Promise.all(Array.from(files).map(async (file: any) => {
        const isOverMaxSize = file.size / 1024 / 1024 > MAX_FILE_SIZE_MB; // Image is larger than MAX_FILE_SIZE_MB

        if (isOverMaxSize) {
          // Image is too large, do some resizing before high quality server conversion
          console.log(`Image is over ${MAX_FILE_SIZE_MB}MB. Converting locally`);
          file = await this.convertImage(file);
        }

        const image = await this.imageService.create(file);
        this.images.push(image);
      }));
    } catch (e) {
      const imageUploadErrorToast = await this.toastCtrl.create({
        message: 'There was an error processing one or more of the images that you selected',
        showCloseButton: true
      });
      imageUploadErrorToast.present();
      console.error(e);
    }

    loading.dismiss();
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

  filePicker() {
    document.getElementById('filePicker').click();
  }

  markAsDirty() {
    this.unsavedChangesService.setPendingChanges();
  }

  markAsClean() {
    this.unsavedChangesService.clearPendingChanges();
  }

  reorderImage(image, direction: number) {
    const imgIdx = this.images.indexOf(image);
    let newImgIdx = imgIdx + direction;
    if (newImgIdx < 0) newImgIdx = 0;
    if (newImgIdx > this.images.length - 1) newImgIdx = this.images.length - 1;

    this.images.splice(imgIdx, 1); // Remove
    this.images.splice(newImgIdx, 0, image); // Insert
  }
}
