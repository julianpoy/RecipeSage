import { Component, Input, Output, EventEmitter, inject } from "@angular/core";
import {
  MealOption,
  MealOptionService,
} from "../../../services/meal-option.service";
import type { MealPlanItemSummary } from "@recipesage/prisma";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { CalendarItemComponent } from "../calendar-item/calendar-item.component";
import { TRPCService } from "../../../services/trpc.service";
import { MealOptionDefaultService } from "../../../services/meal-option-default.service";
import { MealOptionsPreferenceKey } from "@recipesage/util/shared";
import { PreferencesService } from "../../../services/preferences.service";
import { timeToColor } from "../../../utils/timeToColor";

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
  trpcService = inject(TRPCService);
  mealOptionDefaultService = inject(MealOptionDefaultService);
  preferencesService = inject(PreferencesService);
  mealOptionService = inject(MealOptionService);
  @Input() enableEditing: boolean = false;

  @Output() itemClicked = new EventEmitter<any>();
  @Output() itemDragEnd = new EventEmitter<any>();

  mealItemsDragging: Record<string, boolean> = {};

  meals: MealOption[] = [];
  showTime: boolean = false;

  constructor() {
    this.mealOptionService.fetch().then((options) => {
      this.meals = this.mealOptionDefaultService.add(options ?? []);
    });
    this.showTime =
      this.preferencesService.preferences[MealOptionsPreferenceKey.ShowTime];
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

  getMealColor(mealTime: string) {
    return timeToColor(mealTime);
  }

  mealLabel(mealTime: string) {
    const mealOption = this.meals.find((meal) => meal.mealTime === mealTime);

    if (mealOption) {
      return this.showTime
        ? `${mealOption.title} - <span class="ion-text-nowrap">${mealTime}</span>`
        : mealOption.title;
    }

    return mealTime;
  }
}
