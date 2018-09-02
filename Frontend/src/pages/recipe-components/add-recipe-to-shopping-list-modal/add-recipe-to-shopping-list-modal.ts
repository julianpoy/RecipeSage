import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ToastController, ViewController, ModalController, AlertController } from 'ionic-angular';
import { ShoppingListServiceProvider } from '../../../providers/shopping-list-service/shopping-list-service';
import { LoadingServiceProvider } from '../../../providers/loading-service/loading-service';
import { RecipeServiceProvider } from '../../../providers/recipe-service/recipe-service';
import { UtilServiceProvider } from '../../../providers/util-service/util-service';

@IonicPage({
  priority: 'low'
})
@Component({
  selector: 'page-add-recipe-to-shopping-list-modal',
  templateUrl: 'add-recipe-to-shopping-list-modal.html',
})
export class AddRecipeToShoppingListModalPage {

  recipe: any;
  scale: any = 1;
  ingredients: any = [];

  shoppingLists: any = [];
  ingredientBinders: any = {};

  destinationShoppingList: any;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public shoppingListService: ShoppingListServiceProvider,
    public recipeService: RecipeServiceProvider,
    public loadingService: LoadingServiceProvider,
    public utilService: UtilServiceProvider,
    public toastCtrl: ToastController,
    public alertCtrl: AlertController,
    public viewCtrl: ViewController,
    public modalCtrl: ModalController
  ) {
    this.recipe = navParams.get('recipe');
    this.scale = navParams.get('recipeScale') || 1;

    this.applyScale();

    this.ingredientBinders = {};
    for (var i = 0; i < this.ingredients.length; i++) {
      this.ingredientBinders[i] = true;
    }
  }

  ionViewDidLoad() {}

  ionViewWillEnter() {
    var loading = this.loadingService.start();
    this.loadLists().then(function () {
      loading.dismiss();
    }, function () {
      loading.dismiss();
    });
  }

  changeScale() {
    this.recipeService.scaleIngredientsPrompt(this.scale, (scale) => {
      this.scale = scale;
      this.applyScale();
    });
  }

  applyScale() {
    this.ingredients = this.recipeService.scaleIngredients(this.recipe.ingredients, this.scale);
  }

  loadLists() {
    var me = this;

    return new Promise(function (resolve, reject) {
      me.shoppingListService.fetch().subscribe(function (response) {
        me.shoppingLists = response;

        resolve();
      }, function (err) {
        reject();

        switch (err.status) {
          case 0:
            let offlineToast = me.toastCtrl.create({
              message: me.utilService.standardMessages.offlineFetchMessage,
              duration: 5000
            });
            offlineToast.present();
            break;
          case 401:
            me.navCtrl.setRoot('LoginPage', {}, { animate: true, direction: 'forward' });
            break;
          default:
            let errorToast = me.toastCtrl.create({
              message: me.utilService.standardMessages.unexpectedError,
              duration: 30000
            });
            errorToast.present();
            break;
        }
      });
    });
  }

  isFormValid() {
    if (!this.destinationShoppingList) return false;

    for (var key in this.ingredientBinders) {
      if (this.ingredientBinders.hasOwnProperty(key) && this.ingredientBinders[key]) return true;
    }
  }

  save() {
    var items = [];
    for (var i = 0; i < this.ingredients.length; i++) {
      if (this.ingredientBinders[i]) {
        items.push({
          title: this.ingredients[i],
          recipe: this.recipe._id
        });
      }
    }

    var me = this;
    var loading = this.loadingService.start();

    this.shoppingListService.addItems({
      _id: this.destinationShoppingList._id,
      items: items
    }).subscribe(function (response) {
      loading.dismiss();

      me.viewCtrl.dismiss();
    }, function (err) {
      loading.dismiss();
      switch (err.status) {
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
  }

  createShoppingList() {
    var me = this;
    let modal = this.modalCtrl.create('NewShoppingListModalPage');
    modal.present();
    modal.onDidDismiss(data => {
      if (!data || !data.destination) return;

      if (data.setRoot) {
        // Ignore
      } else {
        // Ignore
      }

      me.toastCtrl.create({
        message: 'Excellent! Now select the list you just created.',
        duration: 6000
      }).present();

      // Check for new lists
      me.loadLists();
    });
  }

  cancel() {
    this.viewCtrl.dismiss();
  }
}
