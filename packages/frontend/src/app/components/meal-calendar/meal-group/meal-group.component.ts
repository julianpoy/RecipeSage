import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from "@angular/core";
import {
  DEFAULT_MEALS,
  DEFAULT_MEAL_I18N,
  DEFAULT_MEAL_COLORS,
} from "@recipesage/util/shared";
import type { MealPlanItemSummary } from "@recipesage/prisma";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { CalendarItemComponent } from "../calendar-item/calendar-item.component";

@Component({
  standalone: true,
  selector: "meal-group",
  templateUrl: "meal-group.component.html",
  styleUrls: ["./meal-group.component.scss"],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [...SHARED_UI_IMPORTS, CalendarItemComponent],
})
export class MealGroupComponent {
  @Input({
    required: true,
  })
  mealItems!: {
    meals: string[];
    itemsByMeal: Record<string, MealPlanItemSummary[]>;
  };
  @Input() enableEditing: boolean = false;
  @Input() mealColors: Record<string, string> = {};
  @Input() mealDisplayNames: Record<string, string> = {};

  @Output() itemClicked = new EventEmitter<any>();
  @Output() itemDragEnd = new EventEmitter<any>();

  mealItemsDragging: Record<string, boolean> = {};

  dragStart(event: any, mealItem: MealPlanItemSummary) {
    this.mealItemsDragging[mealItem.id] = true;
    event.dataTransfer.setData("text", mealItem.id);
  }

  dragEnd(_: any, mealItem: any) {
    this.mealItemsDragging[mealItem.id] = false;
    this.itemDragEnd.emit();
  }

  isDefaultMeal(mealName: string): boolean {
    return DEFAULT_MEALS.includes(mealName);
  }

  mealNameToI18n(mealName: string): string | undefined {
    return DEFAULT_MEAL_I18N[mealName];
  }

  getDisplayName(mealName: string): string {
    return this.mealDisplayNames[mealName] || mealName;
  }

  getMealBorderColor(mealName: string): string {
    return (
      this.mealColors[mealName] ||
      DEFAULT_MEAL_COLORS[mealName] ||
      DEFAULT_MEAL_COLORS.other
    );
  }
}
