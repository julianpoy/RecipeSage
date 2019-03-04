import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, AlertController, ToastController, ModalController } from 'ionic-angular';

import { RecipeServiceProvider, Recipe } from '../../../providers/recipe-service/recipe-service';
import { LabelServiceProvider } from '../../../providers/label-service/label-service';
import { LoadingServiceProvider } from '../../../providers/loading-service/loading-service';
import { UtilServiceProvider } from '../../../providers/util-service/util-service';

@IonicPage({
  segment: 'recipe/:recipeId',
  priority: 'high'
})
@Component({
  selector: 'page-recipe',
  templateUrl: 'recipe.html',
  providers: [ RecipeServiceProvider, LabelServiceProvider ]
})
export class RecipePage {

  recipe: Recipe;
  recipeId: string;
  ingredients: any;
  instructions: string[];

  scale: number = 1;

  labelObjectsByTitle: any = {};
  existingLabels: any = [];
  selectedLabels: any = [];
  pendingLabel: string = '';
  showAutocomplete: boolean = false;

  constructor(
    public navCtrl: NavController,
    public alertCtrl: AlertController,
    public toastCtrl: ToastController,
    public modalCtrl: ModalController,
    public loadingService: LoadingServiceProvider,
    public navParams: NavParams,
    public utilService: UtilServiceProvider,
    public recipeService: RecipeServiceProvider,
    public labelService: LabelServiceProvider) {

    this.recipeId = navParams.get('recipeId');
    this.recipe = <Recipe>{};

    this.applyScale();
  }

  ionViewWillEnter() {
    var loading = this.loadingService.start();

    this.recipe = <Recipe>{};

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
      loader.complete();
    }, () => {
      loader.complete();
    });

    this.loadLabels();
  }

  loadAll() {
    return Promise.all([this.loadRecipe(), this.loadLabels()])
  }

  loadRecipe() {
    return new Promise((resolve, reject) => {
      this.recipeService.fetchById(this.recipeId).subscribe(response => {
        this.recipe = response;

        if (this.recipe.instructions && this.recipe.instructions.length > 0) {
          this.instructions = this.recipe.instructions.split(/\r?\n/);
        }

        this.applyScale();

        this.selectedLabels = this.recipe.labels.map(label => label.title)

        resolve();
      }, err => {
        switch(err.status) {
          case 0:
            let offlineToast = this.toastCtrl.create({
              message: this.utilService.standardMessages.offlineFetchMessage,
              duration: 5000
            });
            offlineToast.present();
            break;
          case 401:
            this.navCtrl.setRoot('LoginPage', {}, {animate: true, direction: 'forward'});
            break;
          case 404:
            let errorToast = this.toastCtrl.create({
              message: 'Recipe not found. Does this recipe URL exist?',
              duration: 30000,
              dismissOnPageChange: true
            });
            errorToast.present();
            break;
          default:
            errorToast = this.toastCtrl.create({
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
      this.labelService.fetch().subscribe(response => {
        this.labelObjectsByTitle = {};
        this.existingLabels = [];

        for (var i = 0; i < response.length; i++) {
          var label = response[i];
          this.existingLabels.push(label.title);
          this.labelObjectsByTitle[label.title] = label;
        }

        this.existingLabels.sort((a, b) => {
          if (this.labelObjectsByTitle[a].recipeCount === this.labelObjectsByTitle[b].recipeCount) return 0;
          return this.labelObjectsByTitle[a].recipeCount > this.labelObjectsByTitle[b].recipeCount ? -1 : 1;
        });

        resolve();
      }, err => {
        reject();

        switch(err.status) {
          case 0:
          case 401:
            // Ignore, handled by main loader
            break;
          default:
            let errorToast = this.toastCtrl.create({
              message: this.utilService.standardMessages.unexpectedError,
              duration: 30000
            });
            errorToast.present();
            break;
        }
      });
    });
  }

  ionViewDidLoad() {}

  changeScale() {
    this.recipeService.scaleIngredientsPrompt(this.scale, scale => {
      this.scale = scale;
      this.applyScale();
    });
  }

  applyScale() {
    this.ingredients = this.recipeService.scaleIngredients(this.recipe.ingredients, this.scale, true);
  }

  editRecipe() {
    this.navCtrl.push('EditRecipePage', {
      recipe: this.recipe
    });
  }

  deleteRecipe() {
    let alert = this.alertCtrl.create({
      title: 'Confirm Delete',
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
    var loading = this.loadingService.start();

    this.recipeService.remove(this.recipe).subscribe(response => {
      loading.dismiss();

      this.navCtrl.setRoot('HomePage', { folder: this.recipe.folder }, {animate: true, direction: 'forward'});
    }, err => {
      loading.dismiss();
      switch(err.status) {
        case 0:
          this.toastCtrl.create({
            message: this.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          }).present();
          break;
        case 401:
          this.toastCtrl.create({
            message: this.utilService.standardMessages.unauthorized,
            duration: 6000
          }).present();
          break;
        case 404:
          this.toastCtrl.create({
            message: 'Can\'t find the recipe you\'re trying to delete.',
            duration: 6000
          }).present();
          break;
        default:
          this.toastCtrl.create({
            message: this.utilService.standardMessages.unexpectedError,
            duration: 6000
          }).present();
          break;
      }
    });
  }

  addRecipeToShoppingList() {
    let addRecipeToShoppingListModal = this.modalCtrl.create('AddRecipeToShoppingListModalPage', {
      recipe: this.recipe,
      recipeScale: this.scale
    });
    addRecipeToShoppingListModal.present();
  }

  printRecipe() {
    let printRecipeModal = this.modalCtrl.create('PrintRecipeModalPage', { recipe: this.recipe });
    printRecipeModal.present();
  }

  shareRecipe() {
    let shareModal = this.modalCtrl.create('ShareModalPage', { recipe: this.recipe });
    shareModal.present();
    shareModal.onDidDismiss(data => {
      if (!data || !data.destination) return;

      if (data.setRoot) {
        this.navCtrl.setRoot(data.destination, data.routingData || {}, {animate: true, direction: 'forward'});
      } else {
        this.navCtrl.push(data.destination, data.routingData);
      }
    });
  }

  moveToFolder(folderName) {
    var loading = this.loadingService.start();

    this.recipe.folder = folderName;

    console.log(this.recipe)

    this.recipeService.update(this.recipe).subscribe(response => {
      loading.dismiss();

      this.navCtrl.setRoot('RecipePage', {
        recipe: response,
        recipeId: response.id
      }, {animate: true, direction: 'forward'});
    }, err => {
      loading.dismiss();
      switch(err.status) {
        case 0:
          this.toastCtrl.create({
            message: this.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          }).present();
          break;
        case 401:
          this.toastCtrl.create({
            message: this.utilService.standardMessages.unauthorized,
            duration: 6000
          }).present();
          break;
        default:
          this.toastCtrl.create({
            message: this.utilService.standardMessages.unexpectedError,
            duration: 6000
          }).present();
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

  addLabel(title) {
    if (title.length === 0) {
      this.toastCtrl.create({
        message: 'Please enter a label and press enter to label this recipe.',
        duration: 6000
      }).present();
      return;
    }

    var loading = this.loadingService.start();

    this.labelService.create({
      recipeId: this.recipe.id,
      title: title.toLowerCase()
    }).subscribe(response => {
      loading.dismiss();

      this.loadAll().then(() => {
        this.toggleAutocomplete(false);
        this.pendingLabel = '';
      });
    }, err => {
      loading.dismiss();
      switch(err.status) {
        case 0:
          this.toastCtrl.create({
            message: this.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          }).present();
          break;
        case 401:
          this.toastCtrl.create({
            message: this.utilService.standardMessages.unauthorized,
            duration: 6000
          }).present();
          break;
        case 404:
          this.toastCtrl.create({
            message: 'Can\'t find the recipe you\'re trying to add a label to. Please try again or reload this recipe page.',
            duration: 6000
          }).present();
          break;
        default:
          this.toastCtrl.create({
            message: this.utilService.standardMessages.unexpectedError,
            duration: 6000
          }).present();
          break;
      }
    });
  }

  deleteLabel(label) {
    let alert = this.alertCtrl.create({
      title: 'Confirm Label Removal',
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
    var loading = this.loadingService.start();

    label.recipeId = this.recipe.id;

    this.labelService.remove(label).subscribe(() => {
      loading.dismiss();

      if (label.recipeCount === 1) {
        var i = this.existingLabels.indexOf(label.title);
        this.existingLabels.splice(i, 1);
        delete this.labelObjectsByTitle[label.title];
      } else {
        label.recipeCount -= 1;
      }

      var lblIdx = this.recipe.labels.findIndex(el => {
        return el.id === label.id;
      });
      this.recipe.labels.splice(lblIdx, 1);

      var idx = this.selectedLabels.indexOf(label.title);
      this.selectedLabels.splice(idx, 1);
    }, err => {
      loading.dismiss();
      switch(err.status) {
        case 0:
          this.toastCtrl.create({
            message: this.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          }).present();
          break;
        case 404:
          this.toastCtrl.create({
            message: 'Can\'t find the recipe you\'re trying to delete a label from. Please try again or reload this recipe page.',
            duration: 6000
          }).present();
          break;
        default:
          this.toastCtrl.create({
            message: this.utilService.standardMessages.unexpectedError,
            duration: 6000
          }).present();
          break;
      }
    });
  }

  prettyDateTime(datetime) {
    if (!datetime) return '';
    return this.utilService.formatDate(datetime, { times: true });
  }
}
