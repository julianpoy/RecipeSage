import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'select-ingredients',
  templateUrl: 'select-ingredients.html'
})
export class SelectIngredientsComponent {

  ingredientBinders: any = {};

  _ingredients: any;
  @Input()
  get ingredients() {
    return this._ingredients;
  }

  set ingredients(val) {
    this._ingredients = (val || '').match(/[^\r\n]+/g) || [];

    this.selectedIngredients = [];
    this.ingredientBinders = {};

    for (var i = 0; i < (this.ingredients || []).length; i++) {
      this.ingredientBinders[i] = true;
      this.selectedIngredients.push(this.ingredients[i]);
    }

    this.selectedIngredientsChange.emit(this.selectedIngredients);
  }

  selectedIngredients: any;

  @Output() selectedIngredientsChange = new EventEmitter();

  constructor() {}

  toggleIngredient(i) {
    if (this.ingredientBinders[i]) {
      this.selectedIngredients.push(this.ingredients[i]);
    } else {
      this.selectedIngredients.splice(this.selectedIngredients.indexOf(this.ingredients[i]), 1);
    }
  }
}
