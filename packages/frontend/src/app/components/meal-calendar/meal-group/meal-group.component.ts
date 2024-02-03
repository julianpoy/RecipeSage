import { Component, Input, Output, EventEmitter } from "@angular/core";
import { MealName, MealPlanItem } from "../../../services/meal-plan.service";

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
    meals: MealName[];
    itemsByMeal: Record<MealName, MealPlanItem[]>;
  };
  @Input() enableEditing: boolean = false;

  @Output() itemClicked = new EventEmitter<any>();
  @Output() itemDragEnd = new EventEmitter<any>();

  mealItemsDragging: Record<string, boolean> = {};

  constructor() {}

  dragStart(event: any, mealItem: MealPlanItem) {
    this.mealItemsDragging[mealItem.id] = true;
    event.dataTransfer.setData("text", mealItem.id); // Must set 'text' prop for Android dragndrop, otherwise evt will be cancelled
  }

  dragEnd(_: any, mealItem: any) {
    this.mealItemsDragging[mealItem.id] = false;
    this.itemDragEnd.emit();
  }
}
