import { Component, Input } from "@angular/core";
import { MealPlanItem } from "../../../services/meal-plan.service";

@Component({
  selector: "calendar-item",
  templateUrl: "calendar-item.component.html",
  styleUrls: ["./calendar-item.component.scss"],
})
export class CalendarItemComponent {
  @Input({
    required: true,
  })
  mealItem!: MealPlanItem;

  constructor() {}
}
