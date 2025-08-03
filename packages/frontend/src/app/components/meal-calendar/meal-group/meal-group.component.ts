import { Component, Input, Output, EventEmitter, inject } from "@angular/core";
import { MealName } from "../../../services/meal-plan.service";
import { MealOption, MealOptionService } from "../../../services/meal-option.service";
import type { MealPlanItemSummary } from "@recipesage/prisma";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { CalendarItemComponent } from "../calendar-item/calendar-item.component";

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
    itemsByMeal: Record<string, MealPlanItemSummary[]>;
  };
  @Input() enableEditing: boolean = false;

  @Output() itemClicked = new EventEmitter<any>();
  @Output() itemDragEnd = new EventEmitter<any>();

  mealItemsDragging: Record<string, boolean> = {};

  meals: MealOption[] = [];

  constructor() {
    const mealOptionService = inject(MealOptionService);
    mealOptionService.fetch().then((response) => {
      if (response.data) {
        this.meals = response.data;
      }
    });
  }

  getObjectKeys(obj: Object) {
    if (!obj) {
      return [];
    }
    return Object.keys(obj);
  }

  dragStart(event: any, mealItem: MealPlanItemSummary) {
    this.mealItemsDragging[mealItem.id] = true;
    event.dataTransfer.setData("text", mealItem.id); // Must set 'text' prop for Android dragndrop, otherwise evt will be cancelled
  }

  dragEnd(_: any, mealItem: any) {
    this.mealItemsDragging[mealItem.id] = false;
    this.itemDragEnd.emit();
  }

  mealNameToI18n(mealName: string) {
    const mealOption = this.meals.find((meal) => meal.mealTime === mealName) ;

    return mealOption?.title || mealName;
  }
}
