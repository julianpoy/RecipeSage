import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ToastController, ViewController, ModalController } from 'ionic-angular';
import { ShoppingListServiceProvider } from '../../../providers/shopping-list-service/shopping-list-service';
import { LoadingServiceProvider } from '../../../providers/loading-service/loading-service';

@IonicPage()
@Component({
  selector: 'page-add-recipe-to-shopping-list-modal',
  templateUrl: 'add-recipe-to-shopping-list-modal.html',
})
export class AddRecipeToShoppingListModalPage {

  recipe: any;
  recipeScale: any;
  ingredients: any = [];

  shoppingLists: any = [];
  ingredientBinders: any = {};

  destinationShoppingList: any;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public shoppingListService: ShoppingListServiceProvider,
    public loadingService: LoadingServiceProvider,
    public toastCtrl: ToastController,
    public viewCtrl: ViewController,
    public modalCtrl: ModalController
  ) {
    this.recipe = navParams.get('recipe');
    this.recipeScale = navParams.get('recipeScale');

    this.ingredientBinders = {};

    this.ingredients = [];
    var htmlIngredients = navParams.get('ingredients');
    if (htmlIngredients) {
      for (var i = 0; i < htmlIngredients.length; i++) {
        this.ingredients.push(htmlIngredients[i].replace('<b>', '').replace('</b>', ''));
        this.ingredientBinders[i] = true;
      }
    }
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad AddRecipeToShoppingListModalPage');
  }

  ionViewWillEnter() {
    this.loadLists();
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
              message: 'It looks like you\'re offline. While offline, we\'re only able to fetch data you\'ve previously accessed on this device.',
              duration: 5000
            });
            offlineToast.present();
            break;
          case 401:
            me.navCtrl.setRoot('LoginPage', {}, { animate: true, direction: 'forward' });
            break;
          default:
            let errorToast = me.toastCtrl.create({
              message: 'An unexpected error occured. Please restart application.',
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
  }

  createShoppingList() {
    var me = this;
    let modal = this.modalCtrl.create('NewShoppingListModalPage');
    modal.present();
    modal.onDidDismiss(data => {
      if (!data.destination) return;

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
