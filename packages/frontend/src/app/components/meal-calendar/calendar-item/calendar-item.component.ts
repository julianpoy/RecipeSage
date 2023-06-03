import { Component, Input } from "@angular/core";

@Component({
  selector: "calendar-item",
  templateUrl: "calendar-item.component.html",
  styleUrls: ["./calendar-item.component.scss"],
})
export class CalendarItemComponent {
  @Input() mealItem;

  constructor() {}
}
