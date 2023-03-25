import { Component, Input } from '@angular/core';
import { NavController, ToastController, ModalController, AlertController } from '@ionic/angular';
import {TranslateService} from '@ngx-translate/core';

import { ShoppingListService } from '@/services/shopping-list.service';
import { LoadingService } from '@/services/loading.service';
import { RecipeService, ParsedIngredient } from '@/services/recipe.service';
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
  selectedIngredients: ParsedIngredient[] = [];

  shoppingLists: any;

  destinationShoppingList: any;

  @Input() reference: any;

  constructor(
    public navCtrl: NavController,
    public translate: TranslateService,
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

  async loadLists() {
    const response = await this.shoppingListService.fetch();
    if (!response.success) return;

    this.shoppingLists = response.data;

    this.selectLastUsedShoppingList();
  }

  selectedIngredientsChange(recipeId, selectedIngredients) {
    this.selectedIngredientsByRecipe[recipeId] = selectedIngredients;

    this.selectedIngredients = Object.values(this.selectedIngredientsByRecipe).flat() as ParsedIngredient[];
  }

  isFormValid() {
    if (!this.destinationShoppingList) return false;

    return this.selectedIngredients && this.selectedIngredients.length > 0;
  }

  async save() {
    const loading = this.loadingService.start();

    this.saveLastUsedShoppingList();

    const reference = this.reference || Date.now();

    const items = Object.entries(this.selectedIngredientsByRecipe)
      .map(([recipeId, ingredients]) =>
        (ingredients as ParsedIngredient[]).map(ingredient => ({
          title: ingredient.content,
          recipeId,
          reference,
        }))
      ).flat();

    const response = await this.shoppingListService.addItems(this.destinationShoppingList.id, {
      items,
    });
    loading.dismiss();
    if (!response.success) return;

    this.modalCtrl.dismiss();
  }

  async createShoppingList() {
    const message = await this.translate.get('pages.addRecipeToShoppingListModal.newListSuccess').toPromise();

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
            message,
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
