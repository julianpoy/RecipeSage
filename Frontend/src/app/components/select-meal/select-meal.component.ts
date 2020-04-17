import { Component, Input, Output, EventEmitter } from '@angular/core';

const LAST_USED_MEAL_VAR = 'lastUsedMeal';

@Component({
  selector: 'select-meal',
  templateUrl: 'select-meal.component.html',
  styleUrls: ['./select-meal.component.scss']
})
export class SelectMealComponent {
  @Input() meal = '';
  @Output() mealChange = new EventEmitter();

  mealOptions = [{
    title: 'Breakfast',
    key: 'breakfast',
  }, {
    title: 'Lunch',
    key: 'lunch',
  }, {
    title: 'Dinner',
    key: 'dinner',
  }, {
    title: 'Snack',
    key: 'snacks',
  }, {
    title: 'Other',
    key: 'other',
  }];

  constructor() {
    if (!this.meal) {
      this.selectLastUsedMeal();
    }
  }

  selectLastUsedMeal() {
    const lastUsedMeal = localStorage.getItem(LAST_USED_MEAL_VAR);
    const mealExists = this.mealOptions.find(option => option.key === lastUsedMeal);

    if (mealExists) this.meal = lastUsedMeal;
  }

  saveLastUsedMeal() {
    localStorage.setItem(LAST_USED_MEAL_VAR, this.meal);
  }

  mealChanged() {
    this.mealChange.emit(this.meal);
    this.saveLastUsedMeal();
  }
}
