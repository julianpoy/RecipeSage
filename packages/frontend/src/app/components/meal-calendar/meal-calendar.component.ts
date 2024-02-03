import { Component, Input, Output, EventEmitter } from "@angular/core";
import dayjs, { Dayjs } from "dayjs";

import { UtilService } from "../../services/util.service";
import { PreferencesService } from "~/services/preferences.service";
import { MealPlanPreferenceKey } from "@recipesage/util";
import {
  MealName,
  MealPlan,
  MealPlanItem,
} from "../../services/meal-plan.service";

@Component({
  selector: "meal-calendar",
  templateUrl: "meal-calendar.component.html",
  styleUrls: ["./meal-calendar.component.scss"],
})
export class MealCalendarComponent {
  private _mealPlan!: MealPlan;

  @Input({
    required: true,
  })
  set mealPlan(mealPlan: MealPlan) {
    this._mealPlan = mealPlan;
    this.processIncomingMealPlan();
  }
  get mealPlan() {
    return this._mealPlan;
  }

  @Input() enableEditing = false;
  @Input() mode = "outline";

  @Output() mealsByDateChange = new EventEmitter<any>();
  _mealsByDate: {
    [year: number]: {
      [month: number]: {
        [day: number]: {
          itemsByMeal: {
            [key in MealName]: MealPlanItem[];
          };
          items: MealPlanItem[];
          meals: MealName[];
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

  @Output() selectedDaysChange = new EventEmitter<number[]>();

  @Output() itemMoved = new EventEmitter<any>();
  @Output() itemClicked = new EventEmitter<any>();
  @Output() dayClicked = new EventEmitter<any>();

  private _selectedDays: number[] = [this.getToday().getTime()];
  highlightedDay?: Dayjs;
  dayDragInProgress = false;

  set selectedDays(selectedDays) {
    this._selectedDays = selectedDays;
    this.selectedDaysChange.emit(selectedDays);
  }

  get selectedDays() {
    return this._selectedDays;
  }

  constructor(
    public utilService: UtilService,
    public preferencesService: PreferencesService,
  ) {
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

  getToday(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  // Moves the calendar. Positive = next month, negative = last month
  moveCalendar(direction: -1 | 1) {
    this.center = this.getNewCenter(direction);
    const bounds = this.generateCalendar();

    if (
      dayjs(this.selectedDays[0]).isBefore(bounds[0]) ||
      dayjs(this.selectedDays[0]).isAfter(bounds[1])
    ) {
      this.selectedDays = [this.center.getTime()];
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

  processIncomingMealPlan() {
    this.mealsByDate = {};

    const mealSortOrder = {
      breakfast: 1,
      lunch: 2,
      dinner: 3,
      snacks: 4,
      other: 5,
    };
    this.mealPlan.items
      .sort((a, b) => {
        const comp =
          (mealSortOrder[a.meal as keyof typeof mealSortOrder] || 6) -
          (mealSortOrder[b.meal as keyof typeof mealSortOrder] || 6);
        if (comp === 0) return a.title.localeCompare(b.title);
        return comp;
      })
      .forEach((item) => {
        const day = dayjs(item.scheduled);
        this.mealsByDate[day.year()] = this.mealsByDate[day.year()] || {};
        this.mealsByDate[day.year()][day.month()] =
          this.mealsByDate[day.year()][day.month()] || {};
        const dayData = (this.mealsByDate[day.year()][day.month()][day.date()] =
          this.mealsByDate[day.year()][day.month()][day.date()] || {
            itemsByMeal: {
              breakfast: [],
              lunch: [],
              dinner: [],
              snacks: [],
              other: [],
            },
            items: [],
            meals: Object.values(MealName),
          });
        console.log(dayData, day.year(), day.month(), day.date());
        dayData.itemsByMeal[
          item.meal as keyof typeof dayData.itemsByMeal
        ]?.push(item);
        dayData.items.push(item);
      });
  }

  mealItemsByDay(date: Dayjs | Date | string | number) {
    const day = dayjs(date);
    return (
      this.mealsByDate[day.year()]?.[day.month()]?.[day.date()] || {
        meals: [],
        items: [],
      }
    );
  }

  mealItemTitlesByDay(date: Date | string | number) {
    const mealItems = this.mealItemsByDay(date);
    return mealItems.items.map((item: MealPlanItem) => item.title);
  }

  formatItemCreationDate(date: Date | string | number) {
    return this.utilService.formatDate(date, { now: true });
  }

  isSelected(day: Dayjs) {
    return this.selectedDays.includes(day.toDate().getTime());
  }

  dayKeyEnter(event: any, day: Dayjs) {
    this.dayMouseDown(event, day);
    this.dayMouseUp(event, day);
  }

  dayMouseDown(event: any, day: Dayjs) {
    this.dayDragInProgress = true;
    if (event.shiftKey)
      this.selectedDays = this.getDaysBetween(
        this.selectedDays[0],
        day.valueOf(),
      );
    else this.selectedDays = [day.toDate().getTime()];
    this.dayClicked.emit(day.toDate());
  }

  getDaysBetween(day1: number, day2: number): number[] {
    const days: number[] = [];

    const iterDate = new Date(day1);

    while (iterDate <= new Date(day2)) {
      days.push(iterDate.getTime());

      iterDate.setDate(iterDate.getDate() + 1);
    }

    return days;
  }

  dayMouseOver(_: any, day: Dayjs) {
    if (this.dayDragInProgress) {
      this.selectedDays = this.getDaysBetween(
        this.selectedDays[0],
        day.valueOf(),
      );
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
    const mealItem = this.mealPlan.items.find((item) => item.id === mealItemId);
    if (!mealItem) return;

    const currDate = new Date(mealItem.scheduled);
    const newDate = day.toDate();
    // Do not trigger event if the item has not moved to a different day
    if (
      currDate.getFullYear() === newDate.getFullYear() &&
      currDate.getMonth() === newDate.getMonth() &&
      currDate.getDate() === newDate.getDate()
    )
      return;

    this.itemMoved.emit({
      mealItem,
      day: day.toString(),
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
