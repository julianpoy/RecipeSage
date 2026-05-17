import { Input, Component, inject } from "@angular/core";
import {
  NavController,
  ModalController,
  AlertController,
} from "@ionic/angular/standalone";
import { TranslateService } from "@ngx-translate/core";

import { RecipeService } from "~/services/recipe.service";
import { LoadingService } from "~/services/loading.service";
import { CookingToolbarService } from "~/services/cooking-toolbar.service";
import { RouteMap } from "~/services/util.service";

import { NewMealPlanItemModalPage } from "../new-meal-plan-item-modal/new-meal-plan-item-modal.page";
import { AddRecipeToShoppingListModalPage } from "~/pages/recipe-components/add-recipe-to-shopping-list-modal/add-recipe-to-shopping-list-modal.page";

import dayjs from "dayjs";
import type { MealPlanItemSummary } from "@recipesage/prisma";
import { parseNotes } from "@recipesage/util/shared";
import { ServerActionsService } from "../../../services/server-actions.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonItem,
  IonAvatar,
  IonLabel,
  IonFooter,
} from "@ionic/angular/standalone";
import {
  calendar,
  cart,
  close,
  copy,
  create,
  documentText,
  person,
  pin,
  trash,
} from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "page-meal-plan-item-details-modal",
  templateUrl: "meal-plan-item-details-modal.page.html",
  styleUrls: ["meal-plan-item-details-modal.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonItem,
    IonAvatar,
    IonLabel,
    IonFooter,
  ],
})
export class MealPlanItemDetailsModalPage {
  constructor() {
    addIcons({
      calendar,
      cart,
      close,
      copy,
      create,
      documentText,
      person,
      pin,
      trash,
    });
  }

  private navCtrl = inject(NavController);
  private translate = inject(TranslateService);
  private modalCtrl = inject(ModalController);
  private alertCtrl = inject(AlertController);
  private serverActionsService = inject(ServerActionsService);
  cookingToolbarService = inject(CookingToolbarService);
  private recipeService = inject(RecipeService);
  private loadingService = inject(LoadingService);

  @Input({
    required: true,
  })
  mealPlanId!: string;
  @Input({
    required: true,
  })
  mealItem!: MealPlanItemSummary;
  @Input() customMealOptions: string | null = null;

  parsedNotes: ReturnType<typeof parseNotes> = [];

  ngOnInit() {
    if (this.mealItem.notes) {
      this.parsedNotes = parseNotes(this.mealItem.notes);
    }
  }

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
        scheduledDate: this.mealItem.scheduled
          ? dayjs(this.mealItem.scheduled).format("YYYY-MM-DD")
          : this.mealItem.scheduledDate,
        meal: this.mealItem.meal,
        notes: this.mealItem.notes,
        customMealOptions: this.customMealOptions,
      },
    });
    modal.present();

    const { data } = await modal.onDidDismiss();
    const item = data?.items?.[0];
    if (!item) return;

    const loading = this.loadingService.start();

    const result =
      await this.serverActionsService.mealPlans.updateMealPlanItems({
        mealPlanId: this.mealPlanId,
        items: [{ id: this.mealItem.id, ...item }],
      });
    loading.dismiss();
    if (!result) return;

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
        scheduledDate: this.mealItem.scheduledDate,
        meal: this.mealItem.meal,
        notes: this.mealItem.notes,
        customMealOptions: this.customMealOptions,
      },
    });
    modal.present();

    const { data } = await modal.onDidDismiss();
    if (!data?.items?.length) return;

    const loading = this.loadingService.start();

    const result =
      await this.serverActionsService.mealPlans.createMealPlanItems({
        mealPlanId: this.mealPlanId,
        items: data.items,
      });

    loading.dismiss();
    if (!result) return;

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

    const result =
      await this.serverActionsService.mealPlans.deleteMealPlanItems({
        mealPlanId: this.mealPlanId,
        ids: [this.mealItem.id],
      });
    loading.dismiss();
    if (!result) return;

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
      imageUrl: this.mealItem.recipe.recipeImages.at(0)?.image.location,
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
