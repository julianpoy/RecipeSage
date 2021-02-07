import { Component, Input } from '@angular/core';
import { NavController, ToastController, ModalController, AlertController } from '@ionic/angular';

import { ShoppingListService } from '@/services/shopping-list.service';
import { LoadingService } from '@/services/loading.service';
import { RecipeService, Ingredient } from '@/services/recipe.service';
import { UtilService, RouteMap, AuthType } from '@/services/util.service';
import { NewShoppingListModalPage } from '@/pages/shopping-list-components/new-shopping-list-modal/new-shopping-list-modal.page';

@Component({
  selector: 'page-add-recipe-to-shopping-list-modal',
  templateUrl: 'add-recipe-to-shopping-list-modal.page.html',
  styleUrls: ['add-recipe-to-shopping-list-modal.page.scss']
})
export class AddRecipeToShoppingListModalPage {

  @Input() recipes: any[];
  @Input() scale: any = 1;
  selectedIngredientsByRecipe = {};
  selectedIngredients: Ingredient[] = [];

  shoppingLists: any;

  destinationShoppingList: any;

  @Input() reference: any;

  constructor(
    public navCtrl: NavController,
    public shoppingListService: ShoppingListService,
    public recipeService: RecipeService,
    public loadingService: LoadingService,
    public utilService: UtilService,
    public toastCtrl: ToastController,
    public alertCtrl: AlertController,
    public modalCtrl: ModalController
  ) {}

  ionViewWillEnter() {
    const loading = this.loadingService.start();
    this.loadLists().then(() => {
      loading.dismiss();
    }, () => {
      loading.dismiss();
    });
  }

  selectLastUsedShoppingList() {
    const lastUsedShoppingListId = localStorage.getItem('lastUsedShoppingListId');
    const matchingLists = this.shoppingLists.filter(shoppingList => shoppingList.id === lastUsedShoppingListId);
    if (matchingLists.length > 0 || this.shoppingLists.length === 1) {
      this.destinationShoppingList = this.shoppingLists[0];
    }
  }

  saveLastUsedShoppingList() {
    localStorage.setItem('lastUsedShoppingListId', this.destinationShoppingList.id);
  }

  loadLists() {
    return new Promise((resolve, reject) => {
      this.shoppingListService.fetch().then(response => {
        this.shoppingLists = response;

        this.selectLastUsedShoppingList();

        resolve();
      }).catch(async err => {
        reject();

        switch (err.response.status) {
          case 0:
            const offlineToast = await this.toastCtrl.create({
              message: this.utilService.standardMessages.offlineFetchMessage,
              duration: 5000
            });
            offlineToast.present();
            break;
          case 401:
            this.navCtrl.navigateRoot(RouteMap.AuthPage.getPath(AuthType.Login));
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

  selectedIngredientsChange(recipeId, selectedIngredients) {
    this.selectedIngredientsByRecipe[recipeId] = selectedIngredients;

    this.selectedIngredients = Object.values(this.selectedIngredientsByRecipe).flat();
  }

  isFormValid() {
    if (!this.destinationShoppingList) return false;

    return this.selectedIngredients && this.selectedIngredients.length > 0;
  }

  save() {
    const loading = this.loadingService.start();

    this.saveLastUsedShoppingList();

    const reference = this.reference || Date.now();

    const items = Object.entries(this.selectedIngredientsByRecipe)
      .map(([recipeId, ingredients]) =>
        (ingredients as Ingredient[]).map(ingredient => ({
          title: ingredient.content,
          recipeId,
          reference,
        }))
      ).flat();

    this.shoppingListService.addItems({
      id: this.destinationShoppingList.id,
      items,
    }).then(response => {
      loading.dismiss();

      this.modalCtrl.dismiss();
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

  async createShoppingList() {
    const modal = await this.modalCtrl.create({
      component: NewShoppingListModalPage
    });
    modal.present();
    modal.onDidDismiss().then(({ data }) => {
      if (!data || !data.success) return;

      // Check for new lists
      this.loadLists().then(async () => {
        if (this.shoppingLists.length === 1) {
          this.destinationShoppingList = this.shoppingLists[0];
        } else {
          (await this.toastCtrl.create({
            message: 'Excellent! Now select the list you just created.',
            duration: 6000
          })).present();
        }
      });
    });
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
