import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'select-meal',
  templateUrl: 'select-meal.html'
})
export class SelectMealComponent {
  @Input() meal: string = '';
  @Output() mealChange = new EventEmitter();

  constructor() { }
}
