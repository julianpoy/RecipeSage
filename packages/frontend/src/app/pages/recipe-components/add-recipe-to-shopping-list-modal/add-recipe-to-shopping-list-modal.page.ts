import {
  Component,
  EffectRef,
  Injector,
  Input,
  effect,
  inject,
} from "@angular/core";
import {
  NavController,
  ToastController,
  ModalController,
  AlertController,
} from "@ionic/angular/standalone";
import { TranslateService } from "@ngx-translate/core";

import { LoadingService } from "../../../services/loading.service";
import { UtilService } from "../../../services/util.service";
import { NewShoppingListModalPage } from "../../shopping-list-components/new-shopping-list-modal/new-shopping-list-modal.page";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { SelectIngredientsComponent } from "../../../components/select-ingredients/select-ingredients.component";
import { ServerActionsService } from "../../../services/server-actions.service";
import type { RecipeSummary, ShoppingListSummary } from "@recipesage/prisma";
import {
  SHOPPING_LIST_ITEMS_TITLE_LENGTH_LIMIT,
  ParsedIngredient,
} from "@recipesage/util/shared";
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonItem,
  IonSelect,
  IonSelectOption,
  IonLabel,
  IonFooter,
} from "@ionic/angular/standalone";
import { closeOutline, listOutline } from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "page-add-recipe-to-shopping-list-modal",
  templateUrl: "add-recipe-to-shopping-list-modal.page.html",
  styleUrls: ["add-recipe-to-shopping-list-modal.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    SelectIngredientsComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonItem,
    IonSelect,
    IonSelectOption,
    IonLabel,
    IonFooter,
  ],
})
export class AddRecipeToShoppingListModalPage {
  navCtrl = inject(NavController);
  translate = inject(TranslateService);
  loadingService = inject(LoadingService);
  utilService = inject(UtilService);
  toastCtrl = inject(ToastController);
  alertCtrl = inject(AlertController);
  modalCtrl = inject(ModalController);
  serverActionsService = inject(ServerActionsService);
  private injector = inject(Injector);

  @Input({
    required: true,
  })
  recipes!: Pick<RecipeSummary, "id" | "title" | "ingredients">[];
  @Input() scale: string = "1";
  selectedIngredientsByRecipe: { [key: string]: ParsedIngredient[] } = {};
  selectedIngredients: ParsedIngredient[] = [];

  private shoppingListsQuery =
    this.serverActionsService.shoppingLists.getShoppingLists();
  shoppingLists?: ShoppingListSummary[];

  destinationShoppingList?: ShoppingListSummary;

  saving = false;

  constructor() {
    addIcons({ closeOutline, listOutline });
    effect(() => {
      const lists = this.shoppingListsQuery.value();
      if (!lists) return;
      this.shoppingLists = [...lists].sort((a, b) =>
        a.title.localeCompare(b.title),
      );
      if (!this.destinationShoppingList) this.selectLastUsedShoppingList();
    });
  }

  ionViewWillEnter() {
    this.shoppingListsQuery.refresh();
  }

  selectLastUsedShoppingList() {
    if (!this.shoppingLists) return;

    const lastUsedShoppingListId = localStorage.getItem(
      "lastUsedShoppingListId",
    );
    this.destinationShoppingList = this.shoppingLists.find(
      (el) => el.id === lastUsedShoppingListId,
    );
  }

  saveLastUsedShoppingList() {
    if (!this.destinationShoppingList) return;

    localStorage.setItem(
      "lastUsedShoppingListId",
      this.destinationShoppingList.id,
    );
  }

  selectedIngredientsChange(
    recipeId: string,
    selectedIngredients: ParsedIngredient[],
  ) {
    this.selectedIngredientsByRecipe[recipeId] = selectedIngredients;

    this.selectedIngredients = Object.values(
      this.selectedIngredientsByRecipe,
    ).flat();
  }

  isFormValid() {
    if (!this.destinationShoppingList) return false;

    return this.selectedIngredients && this.selectedIngredients.length > 0;
  }

  async save() {
    if (this.saving) return;
    if (!this.destinationShoppingList) return;

    this.saving = true;
    const loading = this.loadingService.start();

    this.saveLastUsedShoppingList();

    const items = Object.entries(this.selectedIngredientsByRecipe)
      .map(([recipeId, ingredients]) =>
        (ingredients as ParsedIngredient[]).map((ingredient) => ({
          title: ingredient.plaintextContent
            .trim()
            .slice(0, SHOPPING_LIST_ITEMS_TITLE_LENGTH_LIMIT),
          recipeId,
        })),
      )
      .flat()
      .filter((item) => item.title.length > 0);

    if (items.length === 0) {
      this.saving = false;
      loading.dismiss();
      this.modalCtrl.dismiss();
      return;
    }

    const response =
      await this.serverActionsService.shoppingLists.createShoppingListItems({
        shoppingListId: this.destinationShoppingList.id,
        items,
      });

    this.saving = false;
    loading.dismiss();
    if (!response) return;

    this.modalCtrl.dismiss();
  }

  async createShoppingList() {
    const message = await this.translate
      .get("pages.addRecipeToShoppingListModal.newListSuccess")
      .toPromise();

    const modal = await this.modalCtrl.create({
      component: NewShoppingListModalPage,
      componentProps: {
        openAfterCreate: false,
      },
    });
    modal.present();
    modal.onDidDismiss().then(({ data }) => {
      if (!data || !data.success || typeof data.id !== "string") return;
      const newId = data.id;

      this.shoppingListsQuery.refresh();

      let ref: EffectRef;
      ref = effect(
        () => {
          const lists = this.shoppingListsQuery.value();
          if (!lists) return;
          const newList = lists.find((l) => l.id === newId);
          if (!newList) return;
          ref.destroy();
          if (lists.length === 1) {
            this.destinationShoppingList = newList;
          } else {
            void this.toastCtrl
              .create({
                message,
                duration: 6000,
              })
              .then((toast) => toast.present());
          }
        },
        { injector: this.injector },
      );
    });
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
