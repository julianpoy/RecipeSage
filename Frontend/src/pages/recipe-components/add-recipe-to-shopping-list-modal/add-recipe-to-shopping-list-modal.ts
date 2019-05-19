import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ToastController, ViewController, ModalController, AlertController } from 'ionic-angular';
import { ShoppingListServiceProvider } from '../../../providers/shopping-list-service/shopping-list-service';
import { LoadingServiceProvider } from '../../../providers/loading-service/loading-service';
import { RecipeServiceProvider, Ingredient } from '../../../providers/recipe-service/recipe-service';
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
  selectedIngredients: Ingredient[] = [];

  shoppingLists: any;

  destinationShoppingList: any;

  reference: any;

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
    this.reference = navParams.get('reference');
  }

  ionViewDidLoad() {}

  ionViewWillEnter() {
    var loading = this.loadingService.start();
    this.loadLists().then(() => {
      loading.dismiss();
    }, () => {
      loading.dismiss();
    });
  }

  selectLastUsedShoppingList() {
    let lastUsedShoppingList = localStorage.getItem('lastUsedShoppingList');
    let matchingLists = this.shoppingLists.filter(shoppingList => shoppingList.id === lastUsedShoppingList);
    if (matchingLists.length > 0) {
      this.destinationShoppingList = this.shoppingLists[0];
    }
  }

  saveLastUsedShoppingList() {
    localStorage.setItem('lastUsedShoppingList', this.destinationShoppingList.id);
  }

  loadLists() {
    return new Promise((resolve, reject) => {
      this.shoppingListService.fetch().subscribe(response => {
        this.shoppingLists = response;

        this.selectLastUsedShoppingList();

        resolve();
      }, err => {
        reject();

        switch (err.status) {
          case 0:
            let offlineToast = this.toastCtrl.create({
              message: this.utilService.standardMessages.offlineFetchMessage,
              duration: 5000
            });
            offlineToast.present();
            break;
          case 401:
            this.navCtrl.setRoot('LoginPage', {}, { animate: true, direction: 'forward' });
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

  isFormValid() {
    if (!this.destinationShoppingList) return false;

    return this.selectedIngredients && this.selectedIngredients.length > 0;
  }

  save() {
    var loading = this.loadingService.start();

    this.saveLastUsedShoppingList();

    this.shoppingListService.addItems({
      id: this.destinationShoppingList.id,
      items: this.selectedIngredients.map(ingredient => ({
        title: ingredient.originalContent,
        recipeId: this.recipe.id,
        reference: this.reference
      }))
    }).subscribe(response => {
      loading.dismiss();

      this.viewCtrl.dismiss();
    }, err => {
      loading.dismiss();
      switch (err.status) {
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

  createShoppingList() {
    let modal = this.modalCtrl.create('NewShoppingListModalPage');
    modal.present();
    modal.onDidDismiss(data => {
      if (!data || !data.destination) return;

      if (data.setRoot) {
        // Ignore
      } else {
        // Ignore
      }

      this.toastCtrl.create({
        message: 'Excellent! Now select the list you just created.',
        duration: 6000
      }).present();

      // Check for new lists
      this.loadLists();
    });
  }

  cancel() {
    this.viewCtrl.dismiss();
  }
}
