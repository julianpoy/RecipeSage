import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RecipeService, Ingredient } from '../../services/recipe.service';

@Component({
  selector: 'select-ingredients',
  templateUrl: 'select-ingredients.component.html',
  styleUrls: ['./select-ingredients.component.scss']
})
export class SelectIngredientsComponent {

  allSelected: boolean = true;
  ingredientBinders: { [index: number]: boolean } = {};
  scaledIngredients: Ingredient[] = [];
  scale: number = 1;

  _ingredients: string;
  @Input()
  get ingredients() {
    return this._ingredients;
  }

  set ingredients(val: string) {
    this._ingredients = val;

    this.selectedIngredients = [];
    this.ingredientBinders = {};

    this.applyScale(true);
  }

  selectedIngredients: Ingredient[];

  @Output() selectedIngredientsChange = new EventEmitter();

  @Input()
  set initialScale(val: number) {
    this.scale = val;
    this.applyScale();
  }

  constructor(public recipeService: RecipeService) {}

  changeScale() {
    this.recipeService.scaleIngredientsPrompt(this.scale, scale => {
      this.scale = scale;
      this.applyScale();
    });
  }

  applyScale(init?: boolean) {
    this.scaledIngredients = this.recipeService.parseIngredients(this._ingredients, this.scale).filter(e => !e.isHeader);

    this.selectedIngredients = [];
    for (var i = 0; i < (this.scaledIngredients || []).length; i++) {
      if (init) this.ingredientBinders[i] = true;
      if (this.ingredientBinders[i]) this.selectedIngredients.push(this.scaledIngredients[i]);
    }

    this.selectedIngredientsChange.emit(this.selectedIngredients);
  }

  toggleIngredient(i: number) {
    if (this.ingredientBinders[i]) {
      this.selectedIngredients.push(this.scaledIngredients[i]);
    } else {
      this.selectedIngredients.splice(this.selectedIngredients.indexOf(this.scaledIngredients[i]), 1);
    }
  }

  resetAll() {
    for (let idx in Object.keys(this.ingredientBinders)) {
      if (this.ingredientBinders.hasOwnProperty(idx)) {
        this.ingredientBinders[idx] = this.allSelected
        this.toggleIngredient(parseInt(idx))
      }
    }
  }
}
