import { Component, Input, Output, EventEmitter } from '@angular/core';

import { UtilService } from '../../services/util.service';

import dayjs, { Dayjs } from 'dayjs';

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

  mealsByDate: any = {};

  @Input() viewOptions: any = {};

  weeksOfMonth: any = [];
  today: Date = new Date();
  center: Date = new Date(this.today);
  dayTitles: string[];

  @Output() selectedMealGroupChange = new EventEmitter<any[]>();
  @Output() selectedDayChange = new EventEmitter<Dayjs>();

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
    public utilService: UtilService
  ) {
    this.selectedDayChange.emit(this.selectedDay);
    this.selectedMealGroupChange.emit(this.mealItemsByDay(this.selectedDay));
    this.generateCalendar();
  }

  // Generates calendar array centered around specified day (today).
  generateCalendar() {
    const { viewOptions, center } = this;

    this.weeksOfMonth = [];

    const base = dayjs(center);
    const startOfMonth = base.startOf('month');
    let startOfCalendar = startOfMonth.startOf('week');
    const endOfMonth = base.endOf('month');
    const endOfCalendar = endOfMonth.endOf('week');

    if (viewOptions.startOfWeek === 'monday') {
      this.dayTitles = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
      startOfCalendar = startOfCalendar.add(1, 'day');

      // Special case for months starting on sunday: Add an additional week before
      if (startOfMonth.day() === 0) {
        startOfCalendar = startOfMonth.subtract(1, 'week').add(1, 'day');
      }
    } else {
      this.dayTitles = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
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

  // Checks if calendar can move in specified direction. Positive = next month, negative = last month
  canMoveCalendar(direction) {
    const newCenter = this.getNewCenter(direction);
    if (direction > 0) {
      const maximum = new Date(this.today.getFullYear() + 1, this.today.getMonth(), 0); // Can't see last month next year
      return newCenter < maximum;
    } else {
      const minimum = new Date(this.today.getFullYear(), this.today.getMonth(), 1); // Can't be less than the first day of this month
      return newCenter >= minimum;
    }
  }

  // Moves the calendar. Positive = next month, negative = last month
  moveCalendar(direction) {
    if (this.canMoveCalendar(direction)) {
      this.center = this.getNewCenter(direction);
      const bounds = this.generateCalendar();

      if (this.selectedDay.isBefore(bounds[0]) || this.selectedDay.isAfter(bounds[1])) {
        this.selectedDay = dayjs(this.center);
      }
    }
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
      const month = item.scheduledDateObj.getMonth();
      const day = item.scheduledDateObj.getDate();
      this.mealsByDate[month] = this.mealsByDate[month] || {};
      this.mealsByDate[month][day] = this.mealsByDate[month][day] || [];
      this.mealsByDate[month][day].push(item);
    });
  }

  mealItemsByDay(day) {
    return (this.mealsByDate[day.month()] || {})[day.date()] || [];
  }

  formatItemCreationDate(plainTextDate) {
    return this.utilService.formatDate(plainTextDate, { now: true });
  }
}
