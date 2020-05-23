import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'meal-group',
  templateUrl: 'meal-group.component.html',
  styleUrls: ['./meal-group.component.scss']
})
export class MealGroupComponent {
  @Input() mealItems;
  @Input() enableEditing;

  @Output() itemClicked = new EventEmitter<any>();

  constructor() {}

  dragStart(event, mealItem) {
    mealItem.dragging = true;
    event.dataTransfer.setData("mealItemId", mealItem.id);
  }

  dragEnd(event, mealItem) {
    mealItem.dragging = false;
  }
}
