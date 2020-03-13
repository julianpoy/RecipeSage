import { Component } from '@angular/core';
import { NavController, ToastController, ModalController, AlertController, PopoverController } from '@ionic/angular';
import { LoadingService } from '@/services/loading.service';
import { RecipeService } from '@/services/recipe.service';
import { CookingToolbarService } from '@/services/cooking-toolbar.service';
import { UtilService, RouteMap } from '@/services/util.service';

import { AddRecipeToShoppingListModalPage } from '../add-recipe-to-shopping-list-modal/add-recipe-to-shopping-list-modal.page';
import { AddRecipeToMealPlanModalPage } from '../add-recipe-to-meal-plan-modal/add-recipe-to-meal-plan-modal.page';
import { PrintRecipeModalPage } from '../print-recipe-modal/print-recipe-modal.page';
import { ShareModalPage } from '@/pages/share-modal/share-modal.page';

@Component({
  selector: 'page-recipe-popover',
  templateUrl: 'recipe-popover.page.html',
  styleUrls: ['recipe-popover.page.scss']
})
export class RecipePopoverPage {

  recipeId: any; // From nav params
  recipe: any; // From nav params
  scale: any; // From nav params

  constructor(
    public popoverCtrl: PopoverController,
    public navCtrl: NavController,
    public utilService: UtilService,
    public loadingService: LoadingService,
    public recipeService: RecipeService,
    public cookingToolbarService: CookingToolbarService,
    public toastCtrl: ToastController,
    public alertCtrl: AlertController,
    public modalCtrl: ModalController
  ) {}

  dismiss() {
    this.popoverCtrl.dismiss();
  }

  editRecipe() {
    this.navCtrl.navigateForward(RouteMap.EditRecipePage.getPath(this.recipeId));
  }

  async deleteRecipe() {
    const alert = await this.alertCtrl.create({
      header: 'Confirm Delete',
      message: 'This will permanently delete the recipe from your account. This action is irreversible.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => {}
        },
        {
          text: 'Delete',
          cssClass: 'alertDanger',
          handler: () => {
            this._deleteRecipe();
          }
        }
      ]
    });
    alert.present();
  }

  private _deleteRecipe() {
    const loading = this.loadingService.start();

    this.recipeService.remove(this.recipe).then(response => {
      loading.dismiss();

      this.navCtrl.navigateRoot(RouteMap.HomePage.getPath(this.recipe.folder));
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
        case 404:
          (await this.toastCtrl.create({
          message: 'Can\'t find the recipe you\'re trying to delete.',
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

  async addRecipeToShoppingList() {
    const modal = await this.modalCtrl.create({
      component: AddRecipeToShoppingListModalPage,
      componentProps: {
        recipe: this.recipe,
        scale: this.scale
      }
    });

    modal.present();
  }

  async addRecipeToMealPlan() {
    const modal = await this.modalCtrl.create({
      component: AddRecipeToMealPlanModalPage,
      componentProps: {
        recipe: this.recipe
      }
    });

    modal.present();
  }

  async printRecipe() {
    const printRecipeModal = await this.modalCtrl.create({
      component: PrintRecipeModalPage,
      componentProps: {
        recipe: this.recipe
      }
    });

    printRecipeModal.present();
  }

  async shareRecipe() {
    const shareModal = await this.modalCtrl.create({
      component: ShareModalPage,
      componentProps: {
        recipe: this.recipe
      }
    });
    shareModal.present();
  }

  cloneRecipe() {
    const loading = this.loadingService.start();

    return new Promise((resolve, reject) => {
      this.recipeService.create({
        ...this.recipe,
        imageIds: this.recipe.images.map(image => image.id)
      }).then(response => {
        resolve();

        this.navCtrl.navigateForward(RouteMap.RecipePage.getPath(response.id));

        loading.dismiss();
      }).catch(async err => {
        reject();
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
    });
  }

  pinRecipe() {
    this.cookingToolbarService.pinRecipe({
      id: this.recipe.id,
      title: this.recipe.title,
      imageUrl: this.recipe.images[0]?.location
    });
  }

  unpinRecipe() {
    this.cookingToolbarService.unpinRecipe(this.recipe.id);
  }
}
