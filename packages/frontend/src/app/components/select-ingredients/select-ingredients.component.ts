import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  ChangeDetectionStrategy,
} from "@angular/core";
import { ModalController } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import {
  ScaleRecipeComponent,
  type UnitSystem,
} from "../../modals/scale-recipe/scale-recipe.component";
import { PreferencesService } from "../../services/preferences.service";
import { UtilService } from "../../services/util.service";
import {
  ShoppingListPreferenceKey,
  ParsedIngredient,
  decodeBasicHtmlEntities,
  parseIngredients,
  inferIngredientsNotation,
  applyDecimalNotation,
  SHOPPING_LIST_ITEMS_TITLE_LENGTH_LIMIT,
  type DecimalNotation,
} from "@recipesage/util/shared";
import { System } from "@recipesage/unitz-ts";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import {
  IonItem,
  IonCheckbox,
  IonList,
  IonItemGroup,
  IonButton,
  IonIcon,
} from "@ionic/angular";
import { addIcons } from "ionicons";
import { createOutline } from "ionicons/icons";
import { AlertModalComponent } from "../alert-modal/alert-modal.component";
import { TextInputComponent } from "../forms/text-input/text-input.component";
import { IngredientTextComponent } from "../ingredient-text/ingredient-text.component";

@Component({
  standalone: true,
  selector: "select-ingredients",
  templateUrl: "select-ingredients.component.html",
  styleUrls: ["./select-ingredients.component.scss"],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    ...SHARED_UI_IMPORTS,
    AlertModalComponent,
    TextInputComponent,
    IngredientTextComponent,
    IonItem,
    IonCheckbox,
    IonList,
    IonItemGroup,
    IonButton,
    IonIcon,
  ],
})
export class SelectIngredientsComponent {
  private modalCtrl = inject(ModalController);
  private preferencesService = inject(PreferencesService);
  private translate = inject(TranslateService);
  private utilService = inject(UtilService);

  allSelected = true;
  ingredientBinders: { [index: number]: boolean } = {};
  scaledIngredients: ParsedIngredient[] = [];
  scale: string = "1";
  unitSystem: UnitSystem = "original";
  decimalNotationMode: DecimalNotation = ".";
  editedTextByIngredientIndex = new Map<number, string>();
  isEditIngredientModalOpen = false;
  editIngredientIndex = 0;
  editIngredientInput = "";
  titleLengthLimit = SHOPPING_LIST_ITEMS_TITLE_LENGTH_LIMIT;

  constructor() {
    addIcons({ createOutline });
  }

  _ingredients!: string;
  @Input({
    required: true,
  })
  get ingredients() {
    return this._ingredients;
  }

  set ingredients(val: string) {
    this._ingredients = decodeBasicHtmlEntities(val);

    this.selectedIngredients = [];
    this.ingredientBinders = {};
    this.editedTextByIngredientIndex.clear();

    this.applyScale(true);
  }

  selectedIngredients: ParsedIngredient[] = [];

  @Output() selectedIngredientsChange = new EventEmitter();

  get scaleDisplay(): string {
    return applyDecimalNotation(this.scale, this.decimalNotationMode);
  }

  @Input()
  set initialScale(val: string) {
    this.scale = val;
    this.applyScale();
  }

  @Input()
  set initialUnitSystem(val: UnitSystem) {
    this.unitSystem = val;
    this.applyScale();
  }

  async changeScale() {
    const modal = await this.modalCtrl.create({
      component: ScaleRecipeComponent,
      componentProps: {
        scale: this.scale,
        unitSystem: this.unitSystem,
        ingredients: this.scaledIngredients ?? [],
        decimalNotationMode: this.decimalNotationMode,
      },
      cssClass: "scaleRecipeModal",
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();

    if (!data) return;

    if (data.scale) {
      this.scale = data.scale;
    }
    if (data.unitSystem) {
      this.unitSystem = data.unitSystem;
    }
    this.applyScale();
  }

  isIngredientIgnored(ingredient: ParsedIngredient) {
    const ignoredIngredients = this.preferencesService.preferences[
      ShoppingListPreferenceKey.IgnoreItemTitles
    ]
      .split("\n")
      .filter((el) => el.trim())
      .map((el) => el.toLowerCase());

    const ingredientLowerCase = ingredient.originalContent.toLowerCase();
    for (const ignoredIngredient of ignoredIngredients) {
      if (ingredientLowerCase.includes(ignoredIngredient)) {
        return true;
      }
    }

    return false;
  }

  applyScale(init?: boolean) {
    this.decimalNotationMode = inferIngredientsNotation(
      this._ingredients,
      this.utilService.getCurrentLocale(),
    );
    const targetSystem =
      this.unitSystem === "metric"
        ? System.METRIC
        : this.unitSystem === "imperial"
          ? System.US
          : undefined;

    this.scaledIngredients = parseIngredients(this._ingredients, this.scale, {
      targetSystem,
      decimalNotationMode: this.decimalNotationMode,
    })
      .filter((e) => !e.isHeader)
      .map((ingredient, index) => {
        const editedText = this.editedTextByIngredientIndex.get(index);
        return editedText === undefined
          ? ingredient
          : { ...ingredient, plaintextContent: editedText };
      });

    this.selectedIngredients = [];
    for (let i = 0; i < (this.scaledIngredients || []).length; i++) {
      const isIgnored = this.isIngredientIgnored(this.scaledIngredients[i]);
      if (init) this.ingredientBinders[i] = !isIgnored;
      if (this.ingredientBinders[i])
        this.selectedIngredients.push(this.scaledIngredients[i]);
    }

    this.selectedIngredientsChange.emit(this.selectedIngredients);
  }

  showEditIngredientInput(i: number) {
    this.editIngredientIndex = i;
    this.editIngredientInput = this.scaledIngredients[i].plaintextContent;
    this.isEditIngredientModalOpen = true;
  }

  submitEditIngredient() {
    const editedText = this.editIngredientInput.trim();
    if (!editedText) return;

    this.isEditIngredientModalOpen = false;
    const currentText =
      this.scaledIngredients[this.editIngredientIndex].plaintextContent;
    if (editedText === currentText) return;

    this.editedTextByIngredientIndex.set(this.editIngredientIndex, editedText);
    this.applyScale();
  }

  toggleIngredient(i: number) {
    if (this.ingredientBinders[i]) {
      this.selectedIngredients.push(this.scaledIngredients[i]);
    } else {
      this.selectedIngredients.splice(
        this.selectedIngredients.indexOf(this.scaledIngredients[i]),
        1,
      );
    }

    this.selectedIngredientsChange.emit(this.selectedIngredients);
  }

  resetAll() {
    for (const idx in Object.keys(this.ingredientBinders)) {
      if (this.ingredientBinders.hasOwnProperty(idx)) {
        this.ingredientBinders[idx] = this.allSelected;
        this.toggleIngredient(parseInt(idx, 10));
      }
    }
  }
}
