import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'select-meal',
  templateUrl: 'select-meal.component.html',
  styleUrls: ['./select-meal.component.scss']
})
export class SelectMealComponent {
  @Input() meal = '';
  @Output() mealChange = new EventEmitter();

  constructor() { }
}
