import { Component, Input } from "@angular/core";
import type { MealPlanItemSummary } from "@recipesage/prisma";

@Component({
  standalone: true,
  selector: "calendar-item",
  templateUrl: "calendar-item.component.html",
  styleUrls: ["./calendar-item.component.scss"],
})
export class CalendarItemComponent {
  @Input({
    required: true,
  })
  mealItem!: MealPlanItemSummary;

  constructor() {}
}
