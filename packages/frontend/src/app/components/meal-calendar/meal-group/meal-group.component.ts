import { Component, Input, Output, EventEmitter } from "@angular/core";
import { MealName } from "../../../services/meal-plan.service";
import type { MealPlanItemSummary } from "@recipesage/prisma";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { CalendarItemComponent } from "../calendar-item/calendar-item.component";

const mealNameToI18n = {
  [MealName.Breakfast]: "components.mealCalendar.breakfast",
  [MealName.Lunch]: "components.mealCalendar.lunch",
  [MealName.Dinner]: "components.mealCalendar.dinner",
  [MealName.Snacks]: "components.mealCalendar.snack",
  [MealName.Other]: "components.mealCalendar.other",
} satisfies Record<MealName, string>;

@Component({
  selector: "meal-group",
  templateUrl: "meal-group.component.html",
  styleUrls: ["./meal-group.component.scss"],
  imports: [...SHARED_UI_IMPORTS, CalendarItemComponent],
})
export class MealGroupComponent {
  @Input({
    required: true,
  })
  mealItems!: {
    meals: MealName[];
    itemsByMeal: Record<MealName, MealPlanItemSummary[]>;
  };
  @Input() enableEditing: boolean = false;

  @Output() itemClicked = new EventEmitter<any>();
  @Output() itemDragEnd = new EventEmitter<any>();

  mealItemsDragging: Record<string, boolean> = {};

  constructor() {}

  dragStart(event: any, mealItem: MealPlanItemSummary) {
    this.mealItemsDragging[mealItem.id] = true;
    event.dataTransfer.setData("text", mealItem.id); // Must set 'text' prop for Android dragndrop, otherwise evt will be cancelled
  }

  dragEnd(_: any, mealItem: any) {
    this.mealItemsDragging[mealItem.id] = false;
    this.itemDragEnd.emit();
  }

  mealNameToI18n(mealName: MealName) {
    return mealNameToI18n[mealName];
  }
}
