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
  @Output() itemDragEnd = new EventEmitter<any>();

  constructor() {}

  dragStart(event, mealItem) {
    mealItem.dragging = true;
    event.dataTransfer.setData('text', mealItem.id); // Must set 'text' prop for Android dragndrop, otherwise evt will be cancelled
  }

  dragEnd(event, mealItem) {
    mealItem.dragging = false;
    this.itemDragEnd.emit();
  }
}
