import { Input, Component } from "@angular/core";
import {
  NavController,
  ModalController,
  AlertController,
  ToastController,
} from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import { MealPlanItem, MealPlanService } from "~/services/meal-plan.service";
import { RecipeService } from "~/services/recipe.service";
import { LoadingService } from "~/services/loading.service";
import { CookingToolbarService } from "~/services/cooking-toolbar.service";
import { UtilService, RouteMap } from "~/services/util.service";

import { NewMealPlanItemModalPage } from "../new-meal-plan-item-modal/new-meal-plan-item-modal.page";
import { AddRecipeToShoppingListModalPage } from "~/pages/recipe-components/add-recipe-to-shopping-list-modal/add-recipe-to-shopping-list-modal.page";

import dayjs from "dayjs";

@Component({
  selector: "page-meal-plan-item-details-modal",
  templateUrl: "meal-plan-item-details-modal.page.html",
  styleUrls: ["meal-plan-item-details-modal.page.scss"],
})
export class MealPlanItemDetailsModalPage {
  @Input({
    required: true,
  })
  mealPlanId!: string;
  @Input({
    required: true,
  })
  mealItem!: MealPlanItem;

  constructor(
    public navCtrl: NavController,
    public translate: TranslateService,
    public modalCtrl: ModalController,
    public alertCtrl: AlertController,
    public mealPlanService: MealPlanService,
    public cookingToolbarService: CookingToolbarService,
    public recipeService: RecipeService,
    public loadingService: LoadingService,
    public utilService: UtilService,
    public toastCtrl: ToastController,
  ) {}

  openRecipe() {
    if (!this.mealItem.recipe) return;

    this.navCtrl.navigateForward(
      RouteMap.RecipePage.getPath(this.mealItem.recipe.id),
    );
    this.close();
  }

  async edit() {
    const modal = await this.modalCtrl.create({
      component: NewMealPlanItemModalPage,
      componentProps: {
        isEditing: true,
        inputType: this.mealItem.recipe ? "recipe" : "manualEntry",
        title: this.mealItem.title,
        recipe: this.mealItem.recipe,
        scheduled: this.mealItem.scheduled,
        meal: this.mealItem.meal,
      },
    });
    modal.present();

    const { data } = await modal.onDidDismiss();
    if (!data || !data.item) return;
    const item = data.item;

    const loading = this.loadingService.start();

    const response = await this.mealPlanService.updateItems(this.mealPlanId, {
      items: [
        {
          id: this.mealItem.id,
          title: item.title,
          recipeId: item.recipeId,
          scheduled: item.scheduled,
          meal: item.meal,
        },
      ],
    });
    loading.dismiss();
    if (!response.success) return;

    this.close({
      refresh: true,
    });
  }

  async clone() {
    const modal = await this.modalCtrl.create({
      component: NewMealPlanItemModalPage,
      componentProps: {
        isEditing: false,
        inputType: this.mealItem.recipe ? "recipe" : "manualEntry",
        title: this.mealItem.title,
        recipe: this.mealItem.recipe,
        scheduled: this.mealItem.scheduled,
        meal: this.mealItem.meal,
      },
    });
    modal.present();

    const { data } = await modal.onDidDismiss();
    if (!data || !data.item) return;
    const item = data.item;

    const loading = this.loadingService.start();

    const response = await this.mealPlanService.addItems(this.mealPlanId, {
      items: [
        {
          title: item.title,
          recipeId: item.recipeId,
          scheduled: item.scheduled,
          meal: item.meal,
        },
      ],
    });

    loading.dismiss();
    if (!response.success) return;

    this.close({
      refresh: true,
    });
  }

  async delete() {
    const title = (this.mealItem.recipe || this.mealItem).title;
    const header = await this.translate
      .get("pages.mealPlanItemDetailsModal.delete.header")
      .toPromise();
    const message = await this.translate
      .get("pages.mealPlanItemDetailsModal.delete.message", { title })
      .toPromise();
    const del = await this.translate.get("generic.delete").toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();

    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: cancel,
          role: "cancel",
        },
        {
          text: del,
          cssClass: "alertDanger",
          handler: () => {
            this._delete();
          },
        },
      ],
    });
    alert.present();
  }

  async _delete() {
    const loading = this.loadingService.start();

    const response = await this.mealPlanService.deleteItems(this.mealPlanId, {
      itemIds: this.mealItem.id,
    });
    loading.dismiss();
    if (!response.success) return;

    this.close({
      refresh: true,
    });
  }

  async addToShoppingList() {
    if (!this.mealItem.recipe) return;

    const loading = this.loadingService.start();
    // Fetch complete recipe (this page is provided with only topical recipe details)
    const response = await this.recipeService.getRecipeById(
      this.mealItem.recipe.id,
    );
    loading.dismiss();

    if (response.success) {
      const addRecipeToShoppingListModal = await this.modalCtrl.create({
        component: AddRecipeToShoppingListModalPage,
        componentProps: {
          recipes: [response.data],
        },
      });
      addRecipeToShoppingListModal.present();
    }
  }

  pinRecipe() {
    if (!this.mealItem.recipe) return;

    this.cookingToolbarService.pinRecipe({
      id: this.mealItem.recipe.id,
      title: this.mealItem.recipe.title,
      imageUrl: this.mealItem.recipe.images[0]?.location,
    });
  }

  unpinRecipe() {
    if (!this.mealItem.recipe) return;

    this.cookingToolbarService.unpinRecipe(this.mealItem.recipe.id);
  }

  formatDate(date: Date | string | number) {
    return dayjs(date).format("YYYY-MM-DD");
  }

  close(args?: any) {
    this.modalCtrl.dismiss(args);
  }
}
