import { Component, Input, Output, EventEmitter } from "@angular/core";

@Component({
  selector: "meal-group",
  templateUrl: "meal-group.component.html",
  styleUrls: ["./meal-group.component.scss"],
})
export class MealGroupComponent {
  @Input({
    required: true,
  })
  mealItems!: {
    meals: any[];
  };
  @Input() enableEditing: boolean = false;

  @Output() itemClicked = new EventEmitter<any>();
  @Output() itemDragEnd = new EventEmitter<any>();

  constructor() {}

  dragStart(event: any, mealItem: any) {
    mealItem.dragging = true;
    event.dataTransfer.setData("text", mealItem.id); // Must set 'text' prop for Android dragndrop, otherwise evt will be cancelled
  }

  dragEnd(_: any, mealItem: any) {
    mealItem.dragging = false;
    this.itemDragEnd.emit();
  }
}
