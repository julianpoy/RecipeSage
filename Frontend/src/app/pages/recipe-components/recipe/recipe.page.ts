import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, AlertController, ToastController, ModalController } from '@ionic/angular';

import { RecipeService, Recipe, Instruction, Ingredient } from '@/services/recipe.service';
import { LabelService } from '@/services/label.service';
import { LoadingService } from '@/services/loading.service';
import { UtilService, RouteMap } from '@/services/util.service';
import { AddRecipeToShoppingListModalPage } from '../add-recipe-to-shopping-list-modal/add-recipe-to-shopping-list-modal.page';
import { AddRecipeToMealPlanModalPage } from '../add-recipe-to-meal-plan-modal/add-recipe-to-meal-plan-modal.page';
import { PrintRecipeModalPage } from '../print-recipe-modal/print-recipe-modal.page';
import { ShareModalPage } from '@/pages/share-modal/share-modal.page';
import { AuthModalPage } from '@/pages/auth-modal/auth-modal.page';

@Component({
  selector: 'page-recipe',
  templateUrl: 'recipe.page.html',
  styleUrls: ['recipe.page.scss'],
  providers: [ RecipeService, LabelService ]
})
export class RecipePage {

  defaultBackHref: string = RouteMap.HomePage.getPath('main');

  recipe: Recipe;
  recipeId: string;
  ingredients: Ingredient[];
  instructions: Instruction[];

  scale = 1;

  labelObjectsByTitle: any = {};
  existingLabels: any = [];
  selectedLabels: any = [];
  pendingLabel = '';
  showAutocomplete = false;

  isLoggedIn: boolean;

  constructor(
    public navCtrl: NavController,
    public alertCtrl: AlertController,
    public toastCtrl: ToastController,
    public modalCtrl: ModalController,
    public loadingService: LoadingService,
    public route: ActivatedRoute,
    public utilService: UtilService,
    public recipeService: RecipeService,
    public labelService: LabelService) {

    this.updateIsLoggedIn();

    this.recipeId = this.route.snapshot.paramMap.get('recipeId');
    this.recipe = {} as Recipe;

    this.applyScale();
  }

  ionViewWillEnter() {
    const loading = this.loadingService.start();

    this.recipe = {} as Recipe;

    this.loadAll()
    .then(() => {
      loading.dismiss();
    }, () => {
      loading.dismiss();
    });
  }

  refresh(loader) {
    this.loadAll()
    .then(() => {
      loader.target.complete();
    }, () => {
      loader.target.complete();
    });

    this.loadLabels();
  }

  updateIsLoggedIn() {
    this.isLoggedIn = !!localStorage.getItem('token');
  }

  loadAll() {
    return Promise.all([this.loadRecipe(), this.loadLabels()]);
  }

  loadRecipe() {
    return new Promise((resolve, reject) => {
      this.recipeService.fetchById(this.recipeId).then(response => {
        this.recipe = response;

        if (this.recipe.url && !this.recipe.url.trim().startsWith('http')) {
          this.recipe.url = 'http://' + this.recipe.url.trim();
        }

        if (this.recipe.instructions && this.recipe.instructions.length > 0) {
          this.instructions = this.recipeService.parseInstructions(this.recipe.instructions);
        }

        this.applyScale();

        this.selectedLabels = this.recipe.labels.map(label => label.title);

        resolve();
      }).catch(async err => {
        switch (err.response.status) {
          case 0:
            const offlineToast = await this.toastCtrl.create({
              message: this.utilService.standardMessages.offlineFetchMessage,
              duration: 5000
            });
            offlineToast.present();
            break;
          case 401:
            this.goToAuth(() => {
              this.loadAll();
            });
            break;
          case 404:
            let errorToast = await this.toastCtrl.create({
              message: 'Recipe not found. Does this recipe URL exist?',
              duration: 30000,
              // dismissOnPageChange: true
            });
            errorToast.present();
            break;
          default:
            errorToast = await this.toastCtrl.create({
              message: this.utilService.standardMessages.unexpectedError,
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
    return new Promise((resolve, reject) => {
      this.labelService.fetch().then(response => {
        this.labelObjectsByTitle = {};
        this.existingLabels = [];

        for (let i = 0; i < response.length; i++) {
          const label = response[i];
          this.existingLabels.push(label.title);
          this.labelObjectsByTitle[label.title] = label;
        }

        this.existingLabels.sort((a, b) => {
          if (this.labelObjectsByTitle[a].recipeCount === this.labelObjectsByTitle[b].recipeCount) return 0;
          return this.labelObjectsByTitle[a].recipeCount > this.labelObjectsByTitle[b].recipeCount ? -1 : 1;
        });

        resolve();
      }).catch(async err => {
        reject();

        switch (err.response.status) {
          case 0:
          case 401:
            // Ignore, handled by main loader
            break;
          default:
            const errorToast = await this.toastCtrl.create({
              message: this.utilService.standardMessages.unexpectedError,
              duration: 30000
            });
            errorToast.present();
            break;
        }
      });
    });
  }


  instructionClicked(event, instruction: Instruction) {
    if (instruction.isHeader) return;
    instruction.complete = !instruction.complete;
  }

  ingredientClicked(event, ingredient: Instruction) {
    if (ingredient.isHeader) return;
    ingredient.complete = !ingredient.complete;
  }

  changeScale() {
    this.recipeService.scaleIngredientsPrompt(this.scale, scale => {
      this.scale = scale;
      this.applyScale();
    });
  }

  applyScale() {
    this.ingredients = this.recipeService.parseIngredients(this.recipe.ingredients, this.scale, true);
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
        recipeScale: this.scale
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

  moveToFolder(folderName) {
    const loading = this.loadingService.start();

    this.recipe.folder = folderName;

    console.log(this.recipe);

    this.recipeService.update(this.recipe).then(response => {
      loading.dismiss();

      this.navCtrl.navigateRoot(RouteMap.RecipePage.getPath(response.id)); // TODO: Check that this "refresh" works with new router
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
  }

  toggleAutocomplete(show, event?) {
    if (event && event.relatedTarget) {
      if (event.relatedTarget.className.indexOf('suggestion') > -1) {
        return;
      }
    }
    this.showAutocomplete = show;
  }

  async addLabel(title) {
    if (title.length === 0) {
      (await this.toastCtrl.create({
        message: 'Please enter a label and press enter to label this recipe.',
        duration: 6000
      })).present();
      return;
    }

    const loading = this.loadingService.start();

    this.labelService.create({
      recipeId: this.recipe.id,
      title: title.toLowerCase()
    }).then(response => {
      loading.dismiss();

      this.loadAll().then(() => {
        this.toggleAutocomplete(false);
        this.pendingLabel = '';
      });
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
            message: 'Can\'t find the recipe you\'re trying to add a label to. Please try again or reload this recipe page.',
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

  async deleteLabel(label) {
    const alert = await this.alertCtrl.create({
      header: 'Confirm Label Removal',
      message: 'This will remove the label "' + label.title + '" from this recipe.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => {
            // this.selectedLabels.push(label.title);
          }
        },
        {
          text: 'Remove',
          handler: () => {
            this._deleteLabel(label);
          }
        }
      ]
    });
    alert.present();
  }

  private _deleteLabel(label) {
    const loading = this.loadingService.start();

    label.recipeId = this.recipe.id;

    this.labelService.remove(label).then(() => {
      loading.dismiss();

      if (label.recipeCount === 1) {
        const i = this.existingLabels.indexOf(label.title);
        this.existingLabels.splice(i, 1);
        delete this.labelObjectsByTitle[label.title];
      } else {
        label.recipeCount -= 1;
      }

      const lblIdx = this.recipe.labels.findIndex(el => {
        return el.id === label.id;
      });
      this.recipe.labels.splice(lblIdx, 1);

      const idx = this.selectedLabels.indexOf(label.title);
      this.selectedLabels.splice(idx, 1);
    }).catch(async err => {
      loading.dismiss();
      switch (err.response.status) {
        case 0:
          (await this.toastCtrl.create({
            message: this.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          })).present();
          break;
        case 404:
          (await this.toastCtrl.create({
            message: 'Can\'t find the recipe you\'re trying to delete a label from. Please try again or reload this recipe page.',
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

  cloneRecipe() {
    const loading = this.loadingService.start();

    if (this.recipe.image && this.recipe.image.location) {
      this.recipe.imageURL = this.recipe.image.location;
    }

    return new Promise((resolve, reject) => {
      this.recipeService.create(this.recipe).then(response => {
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

  async goToAuth(cb?: Function) {
    const authModal = await this.modalCtrl.create({
      component: AuthModalPage,
      componentProps: {
        register: !this.isLoggedIn
      }
    });
    authModal.onDidDismiss().then(() => {
      this.updateIsLoggedIn();
      if (cb) cb();
    });
    authModal.present();
  }

  authAndClone() {
    this.goToAuth(() => {
      this.cloneRecipe().then(async () => {
        (await this.toastCtrl.create({
          message: 'The recipe has been saved to your account',
          duration: 5000
        })).present();
      });
    });
  }

  prettyDateTime(datetime) {
    if (!datetime) return '';
    return this.utilService.formatDate(datetime, { times: true });
  }
}
