import { Component, Input, Output, EventEmitter, inject } from "@angular/core";
import dayjs, { Dayjs } from "dayjs";

import { UtilService } from "../../services/util.service";
import { PreferencesService } from "~/services/preferences.service";
import { MealOption, MealOptionService } from "../../services/meal-option.service";
import { MealPlanPreferenceKey } from "@recipesage/util/shared";
import {
  MealName,
  MealPlan,
  MealPlanItem,
} from "../../services/meal-plan.service";
import type { MealPlanItemSummary, MealPlanSummary } from "@recipesage/prisma";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { MealGroupComponent } from "./meal-group/meal-group.component";

@Component({
  selector: "meal-calendar",
  templateUrl: "meal-calendar.component.html",
  styleUrls: ["./meal-calendar.component.scss"],
  imports: [...SHARED_UI_IMPORTS, MealGroupComponent],
})
export class MealCalendarComponent {
  utilService = inject(UtilService);
  preferencesService = inject(PreferencesService);
  mealOptionService = inject(MealOptionService);

  private _mealPlanItems!: MealPlanItemSummary[];
  private _mealOptions!: MealOption[];

  @Input({
    required: true,
  })
  set mealPlanItems(mealPlanItems: MealPlanItemSummary[]) {
    this._mealPlanItems = mealPlanItems;
    this.processIncomingMealPlan();
  }
  get mealPlanItems() {
    return this._mealPlanItems;
  }

  @Input() enableEditing = false;
  @Input() mode = "outline";

  @Output() mealsByDateChange = new EventEmitter<typeof this._mealsByDate>();
  _mealsByDate: {
    [year: number]: {
      [month: number]: {
        [day: number]: {
          itemsByMeal: {
            [mealTime: string]: MealPlanItemSummary[];
          };
          items: MealPlanItemSummary[];
        };
      };
    };
  } = {};
  set mealsByDate(mealsByDate) {
    this._mealsByDate = mealsByDate;
    this.mealsByDateChange.emit(mealsByDate);
  }
  get mealsByDate() {
    return this._mealsByDate;
  }

  preferences = this.preferencesService.preferences;
  preferenceKeys = MealPlanPreferenceKey;

  weeksOfMonth: Dayjs[][] = [];
  today: Date = new Date();
  center: Date = new Date(this.today);
  dayTitles?: string[];

  @Output() selectedDaysChange = new EventEmitter<string[]>();

  @Output() itemMoved = new EventEmitter<any>();
  @Output() itemClicked = new EventEmitter<any>();
  @Output() dayClicked = new EventEmitter<any>();

  private _selectedDays: string[] = [this.getToday()];
  highlightedDay?: Dayjs;
  dayDragInProgress = false;

  set selectedDays(selectedDays) {
    this._selectedDays = selectedDays;
    this.selectedDaysChange.emit(selectedDays);
  }

  get selectedDays() {
    return this._selectedDays;
  }

  constructor() {
    setTimeout(() => {
      this.mealsByDateChange.emit(this.mealsByDate);
      this.selectedDaysChange.emit(this.selectedDays);
    });
    this.generateCalendar();

    document.addEventListener("mouseup", () => {
      this.dayDragInProgress = false;
    });
  }

  // Generates calendar array centered around specified day (today).
  generateCalendar() {
    const { preferences, center } = this;

    this.weeksOfMonth = [];

    const base = dayjs(center);
    const startOfMonth = base.startOf("month");
    let startOfCalendar = startOfMonth.startOf("week");
    const endOfMonth = base.endOf("month");
    const endOfCalendar = endOfMonth.endOf("week");

    if (preferences[MealPlanPreferenceKey.StartOfWeek] === "monday") {
      this.dayTitles = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      startOfCalendar = startOfCalendar.add(1, "day");

      // Special case for months starting on sunday: Add an additional week before
      if (startOfMonth.day() === 0) {
        startOfCalendar = startOfMonth.subtract(1, "week").add(1, "day");
      }
    } else {
      this.dayTitles = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    }

    let iteratorDate = dayjs(startOfCalendar);

    while (iteratorDate.isBefore(endOfCalendar)) {
      const week = [];

      while (week.length < 7) {
        week.push(iteratorDate);
        iteratorDate = iteratorDate.add(1, "day");
      }

      this.weeksOfMonth.push(week);
    }

    return [startOfCalendar, endOfCalendar];
  }

  // Gets new calendar center date. Positive = next month, negative = last month
  getNewCenter(direction: -1 | 1): Date {
    const currentMonth = this.center.getMonth();
    const newMonth = direction > 0 ? currentMonth + 1 : currentMonth - 1;

    return new Date(this.center.getFullYear(), newMonth, 1);
  }

  getToday(): string {
    return dayjs().format("YYYY-MM-DD");
  }

  // Moves the calendar. Positive = next month, negative = last month
  moveCalendar(direction: -1 | 1) {
    this.center = this.getNewCenter(direction);
    const bounds = this.generateCalendar();

    if (
      dayjs(this.selectedDays[0]).isBefore(bounds[0]) ||
      dayjs(this.selectedDays[0]).isAfter(bounds[1])
    ) {
      this.selectedDays = [dayjs(this.center).format("YYYY-MM-DD")];
    }
  }

  calendarTitle() {
    const includeYear = this.center.getFullYear() !== this.today.getFullYear();

    return (
      this.prettyMonthName(this.center) +
      (includeYear ? ` ${this.center.getFullYear()}` : "")
    );
  }

  prettyMonthName(date: Date) {
    return date.toLocaleString(window.navigator.language, { month: "long" });
  }

  getYMD(stamp: string | Date | Dayjs) {
    let dateString;
    if (typeof stamp === "string") {
      dateString = stamp;
    } else {
      const scheduledDayjs = dayjs(stamp);
      dateString = `${scheduledDayjs.year()}-${scheduledDayjs.month() + 1}-${scheduledDayjs.date()}`;
    }

    const [year, month, day] = dateString
      .split("-")
      .map((el) => parseInt(el, 10));

    return [year, month, day];
  }

  processIncomingMealPlan() {
    this.mealsByDate = {};

    this.mealPlanItems
      .sort((a, b) => { return a.meal > b.meal ? 1 : -1; })
      .forEach((item) => {
        const [year, month, day] = this.getYMD(
          item.scheduled || item.scheduledDate,
        );
        this.mealsByDate[year] = this.mealsByDate[year] || {};
        this.mealsByDate[year][month] = this.mealsByDate[year][month] || {};
        const dayData = (this.mealsByDate[year][month][day] = this.mealsByDate[
          year
        ][month][day] || {
          itemsByMeal: {
          },
          items: [],
        });

        if (!dayData.itemsByMeal[item.meal]) {
          dayData.itemsByMeal[item.meal] = [];
        }

        dayData.itemsByMeal[
          item.meal as keyof typeof dayData.itemsByMeal
        ]?.push(item);
        dayData.items.push(item);
      });
  }

  mealItemsByDay(dateStamp: string | Date | Dayjs) {
    const [year, month, day] = this.getYMD(dateStamp);
    return (
      this.mealsByDate[year]?.[month]?.[day] || {
        items: [],
      }
    );
  }

  mealItemTitlesByDay(dateStamp: string) {
    const mealItems = this.mealItemsByDay(dateStamp);
    return mealItems.items.map((item) => item.title);
  }

  formatItemCreationDate(date: Date | string | number) {
    return this.utilService.formatDate(date, { now: true });
  }

  isSelected(day: Dayjs) {
    return this.selectedDays.includes(day.format("YYYY-MM-DD"));
  }

  dayKeyEnter(event: any, day: Dayjs) {
    this.dayMouseDown(event, day);
    this.dayMouseUp(event, day);
  }

  dayMouseDown(event: any, day: Dayjs) {
    this.dayDragInProgress = true;
    if (event.shiftKey)
      this.selectedDays = this.getDaysBetween(this.selectedDays[0], day);
    else this.selectedDays = [day.format("YYYY-MM-DD")];
    this.dayClicked.emit(day.toDate());
  }

  getDaysBetween(
    dateStamp1: string | Dayjs,
    dateStamp2: string | Dayjs,
  ): string[] {
    const dateStamps: string[] = [];

    let iterDate = dayjs(dateStamp1);

    while (iterDate <= dayjs(dateStamp2)) {
      dateStamps.push(iterDate.format("YYYY-MM-DD"));

      iterDate = dayjs(iterDate).add(1, "day");
    }

    return dateStamps;
  }

  dayMouseOver(_: any, day: Dayjs) {
    if (this.dayDragInProgress) {
      this.selectedDays = this.getDaysBetween(this.selectedDays[0], day);
    }
  }

  dayMouseUp(_: any, __: Dayjs) {
    this.dayDragInProgress = false;
  }

  dayDragDrop(event: any, day: Dayjs) {
    event.preventDefault();
    this.dayDragInProgress = false;
    this.highlightedDay = undefined;
    const mealItemId = event.dataTransfer.getData("text");
    const mealItem = this.mealPlanItems.find((item) => item.id === mealItemId);
    if (!mealItem) return;

    const newDate = day.format("YYYY-MM-DD");
    // Do not trigger event if the item has not moved to a different day
    if (mealItem.scheduledDate === newDate) return;

    this.itemMoved.emit({
      mealItem,
      dateStamp: newDate,
    });
  }

  dayDragOver(event: any, day: Dayjs) {
    event.preventDefault();
    this.highlightedDay = day;
  }

  itemDragEnd() {
    this.highlightedDay = undefined;
  }
}
