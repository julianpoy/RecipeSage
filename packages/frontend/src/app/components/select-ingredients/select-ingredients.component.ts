import { Component, Input, Output, EventEmitter } from "@angular/core";
import { PopoverController } from "@ionic/angular";
import { RecipeService, ParsedIngredient } from "../../services/recipe.service";

import { ScaleRecipeComponent } from "~/modals/scale-recipe/scale-recipe.component";
import { PreferencesService } from "../../services/preferences.service";
import { ShoppingListPreferenceKey } from "@recipesage/util";

@Component({
  selector: "select-ingredients",
  templateUrl: "select-ingredients.component.html",
  styleUrls: ["./select-ingredients.component.scss"],
})
export class SelectIngredientsComponent {
  allSelected = true;
  ingredientBinders: { [index: number]: boolean } = {};
  scaledIngredients: ParsedIngredient[] = [];
  scale = 1;

  _ingredients!: string;
  @Input({
    required: true,
  })
  get ingredients() {
    return this._ingredients;
  }

  set ingredients(val: string) {
    this._ingredients = val;

    this.selectedIngredients = [];
    this.ingredientBinders = {};

    this.applyScale(true);
  }

  selectedIngredients: ParsedIngredient[] = [];

  @Output() selectedIngredientsChange = new EventEmitter();

  @Input()
  set initialScale(val: number) {
    this.scale = val;
    this.applyScale();
  }

  constructor(
    private popoverCtrl: PopoverController,
    private recipeService: RecipeService,
    private preferencesService: PreferencesService,
  ) {}

  async changeScale() {
    const popover = await this.popoverCtrl.create({
      component: ScaleRecipeComponent,
      componentProps: {
        scale: this.scale.toString(),
      },
    });

    await popover.present();
    const { data } = await popover.onDidDismiss();

    if (data?.scale) {
      this.scale = data.scale;
      this.applyScale();
    }
  }

  isIngredientIgnored(ingredient: ParsedIngredient) {
    const ignoredIngredients = this.preferencesService.preferences[
      ShoppingListPreferenceKey.IgnoreItemTitles
    ]
      .split("\n")
      .filter((el) => el.trim());

    for (const ignoredIngredient of ignoredIngredients) {
      if (ingredient.originalContent.includes(ignoredIngredient)) {
        return true;
      }
    }

    return false;
  }

  applyScale(init?: boolean) {
    this.scaledIngredients = this.recipeService
      .parseIngredients(this._ingredients, this.scale)
      .filter((e) => !e.isHeader);

    this.selectedIngredients = [];
    for (let i = 0; i < (this.scaledIngredients || []).length; i++) {
      const isIgnored = this.isIngredientIgnored(this.scaledIngredients[i]);
      if (init) this.ingredientBinders[i] = !isIgnored;
      if (this.ingredientBinders[i])
        this.selectedIngredients.push(this.scaledIngredients[i]);
    }

    this.selectedIngredientsChange.emit(this.selectedIngredients);
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
