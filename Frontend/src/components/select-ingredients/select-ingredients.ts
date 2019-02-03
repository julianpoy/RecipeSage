import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RecipeServiceProvider } from '../../providers/recipe-service/recipe-service';

@Component({
  selector: 'select-ingredients',
  templateUrl: 'select-ingredients.html'
})
export class SelectIngredientsComponent {

  allSelected: boolean = true;
  ingredientBinders: any = {};
  scaledIngredients: any = [];
  scale: any = 1;

  _ingredients: any;
  @Input()
  get ingredients() {
    return this._ingredients;
  }

  set ingredients(val) {
    this._ingredients = val;

    this.selectedIngredients = [];
    this.ingredientBinders = {};

    this.applyScale(true);
  }

  selectedIngredients: any;

  @Output() selectedIngredientsChange = new EventEmitter();

  @Input()
  set initialScale(val) {
    this.scale = val;
    this.applyScale();
  }

  constructor(public recipeService: RecipeServiceProvider) {}

  changeScale() {
    this.recipeService.scaleIngredientsPrompt(this.scale, scale => {
      this.scale = scale;
      this.applyScale();
    });
  }

  applyScale(init?) {
    this.scaledIngredients = this.recipeService.scaleIngredients(this._ingredients, this.scale);

    this.selectedIngredients = [];
    for (var i = 0; i < (this.scaledIngredients || []).length; i++) {
      if (init) this.ingredientBinders[i] = true;
      if (this.ingredientBinders[i]) this.selectedIngredients.push(this.scaledIngredients[i]);
    }

    this.selectedIngredientsChange.emit(this.selectedIngredients);
  }

  toggleIngredient(i) {
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
        this.toggleIngredient(idx)
      }
    }
  }
}
