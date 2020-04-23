import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { MealCalendarComponent } from './meal-calendar.component';
import { CalendarItemModule } from './calendar-item/calendar-item.module';

@NgModule({
  declarations: [
    MealCalendarComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    CalendarItemModule
  ],
  exports: [
    MealCalendarComponent
  ]
})
export class MealCalendarModule { }
