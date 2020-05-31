import { Component, Input, Output, EventEmitter } from '@angular/core';
import dayjs, { Dayjs } from 'dayjs';

import { UtilService } from '../../services/util.service';
import { PreferencesService, MealPlanPreferenceKey } from '@/services/preferences.service';

@Component({
  selector: 'meal-calendar',
  templateUrl: 'meal-calendar.component.html',
  styleUrls: ['./meal-calendar.component.scss']
})
export class MealCalendarComponent {
  private _mealPlan;

  @Input()
  set mealPlan(mealPlan) {
    this._mealPlan = mealPlan;
    this.processIncomingMealPlan();
    this.selectedMealGroupChange.emit(this.mealItemsByDay(this.selectedDay));
  }
  get mealPlan() { return this._mealPlan; }

  @Input() enableEditing: boolean = false;
  @Input() mode: string = "outline";

  mealsByDate: any = {};

  preferences = this.preferencesService.preferences;
  preferenceKeys = MealPlanPreferenceKey;

  weeksOfMonth: any = [];
  today: Date = new Date();
  center: Date = new Date(this.today);
  dayTitles: string[];

  @Output() selectedMealGroupChange = new EventEmitter<any[]>();
  @Output() selectedDayChange = new EventEmitter<Dayjs>();

  @Output() itemMoved = new EventEmitter<any>();
  @Output() itemClicked = new EventEmitter<any>();

  private _selectedDay: Dayjs = dayjs(this.today);

  set selectedDay(selectedDay) {
    this._selectedDay = selectedDay;
    this.selectedDayChange.emit(selectedDay);
    this.selectedMealGroupChange.emit(this.mealItemsByDay(this.selectedDay));
  }

  get selectedDay() {
    return this._selectedDay;
  }

  constructor(
    public utilService: UtilService,
    public preferencesService: PreferencesService
  ) {
    this.selectedDayChange.emit(this.selectedDay);
    this.selectedMealGroupChange.emit(this.mealItemsByDay(this.selectedDay));
    this.generateCalendar();
  }

  // Generates calendar array centered around specified day (today).
  generateCalendar() {
    const { preferences, center } = this;

    this.weeksOfMonth = [];

    const base = dayjs(center);
    const startOfMonth = base.startOf('month');
    let startOfCalendar = startOfMonth.startOf('week');
    const endOfMonth = base.endOf('month');
    const endOfCalendar = endOfMonth.endOf('week');

    if (preferences[MealPlanPreferenceKey.StartOfWeek] === 'monday') {
      this.dayTitles = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      startOfCalendar = startOfCalendar.add(1, 'day');

      // Special case for months starting on sunday: Add an additional week before
      if (startOfMonth.day() === 0) {
        startOfCalendar = startOfMonth.subtract(1, 'week').add(1, 'day');
      }
    } else {
      this.dayTitles = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    }

    let iteratorDate = dayjs(startOfCalendar);

    while (iteratorDate.isBefore(endOfCalendar)) {
      const week = [];

      while (week.length < 7) {
        week.push(iteratorDate);
        iteratorDate = iteratorDate.add(1, 'day');
      }

      this.weeksOfMonth.push(week);
    }

    return [startOfCalendar, endOfCalendar];
  }

  // Gets new calendar center date. Positive = next month, negative = last month
  getNewCenter(direction) {
    const currentMonth = this.center.getMonth();
    const newMonth = direction > 0 ? currentMonth + 1 : currentMonth - 1;

    return new Date(this.center.getFullYear(), newMonth, 1);
  }

  // Moves the calendar. Positive = next month, negative = last month
  moveCalendar(direction) {
    this.center = this.getNewCenter(direction);
    const bounds = this.generateCalendar();

    if (this.selectedDay.isBefore(bounds[0]) || this.selectedDay.isAfter(bounds[1])) {
      this.selectedDay = dayjs(this.center);
    }
  }

  calendarTitle() {
    const includeYear = this.center.getFullYear() !== this.today.getFullYear();

    return this.prettyMonthName(this.center) + (includeYear ? ` ${this.center.getFullYear()}` : '')
  }

  prettyMonthName(date) {
    return date.toLocaleString(this.utilService.lang, { month: 'long' });
  }

  processIncomingMealPlan() {
    this.mealsByDate = {};

    const mealSortOrder = {
      breakfast: 1,
      lunch: 2,
      dinner: 3,
      snacks: 4,
      other: 5
    };
    this.mealPlan.items.sort((a, b) => {
      const comp = (mealSortOrder[a.meal] || 6) - (mealSortOrder[b.meal] || 6);
      if (comp === 0) return a.title.localeCompare(b.title);
      return comp;
    }).forEach(item => {
      item.scheduledDateObj = new Date(item.scheduled);
      const day = dayjs(item.scheduledDateObj);
      this.mealsByDate[day.year()] = this.mealsByDate[day.year()] || {};
      this.mealsByDate[day.year()][day.month()] = this.mealsByDate[day.year()][day.month()] || {};
      const dayData = this.mealsByDate[day.year()][day.month()][day.date()] = this.mealsByDate[day.year()][day.month()][day.date()] || {
        itemsByMeal: {
          breakfast: [],
          lunch: [],
          dinner: [],
          snacks: [],
          other: [],
        },
        items: [],
        meals: ["breakfast", "lunch", "dinner", "snacks", "other"]
      };
      dayData.itemsByMeal[item.meal].push(item);
      dayData.items.push(item);
    });
  }

  mealItemsByDay(day) {
    return this.mealsByDate[day.year()]?.[day.month()]?.[day.date()] || {
      meals: [],
      items: []
    };
  }

  formatItemCreationDate(plainTextDate) {
    return this.utilService.formatDate(plainTextDate, { now: true });
  }

  selectedDays = [];
  dayDragInProgress = false;
  dayMouseDown(event, day) {
    this.dayDragInProgress = true;
    this.selectedDays = [day.toDate()];
    console.log(event, day)

    document.addEventListener("mouseup", () => {
      console.log("mouseup!")
    })
    //event.dataTransfer.setData("type", "dayDrag");
    //event.dataTransfer.setData("startDate", day.unix());
    //this.selectedDays = [day];

    //var img = document.createElement('img');
    //img.src = '/svg/scan.svg';
    //document.body.appendChild(img)
    //event.dataTransfer.setDragImage(img, 0, 0);
  }

  dayMouseOver(event, day) {
    if (this.dayDragInProgress) {
      console.log("drag in progress")
    }
  }

  dayMouseUp(event, day) {
    if (this.dayDragInProgress) {
      console.log("yep!")
    }
  }

  dayDragEnd(event, day) {
    //const startDate = event.dataTransfer.getData("startDate");
    //selectedDays = dayjs(startDate);
  }

  dayDragDrop(event, day) {
    event.preventDefault();
    const mealItemId = event.dataTransfer.getData("mealItemId");
    const mealItem = this.mealPlan.items.find(mealItem => mealItem.id === mealItemId);
    if (!mealItem) return;

    const currDate = new Date(mealItem.scheduled);
    const newDate = day.toDate();
    // Do not trigger event if the item has not moved to a different day
    if (
      currDate.getFullYear() === newDate.getFullYear() &&
      currDate.getMonth() === newDate.getMonth() &&
      currDate.getDate() === newDate.getDate()
    ) return;

    this.itemMoved.emit({
      mealItem,
      day: day.toString()
    });
  }

  dayDragOver(event, day) {
    event.preventDefault();
  }
}
