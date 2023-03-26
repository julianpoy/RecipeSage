import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { MealCalendarComponent } from './meal-calendar.component';
import { CalendarItemModule } from './calendar-item/calendar-item.module';
import { MealGroupModule } from './meal-group/meal-group.module';
import {GlobalModule} from '~/global.module';

@NgModule({
  declarations: [
    MealCalendarComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    CalendarItemModule,
    MealGroupModule,
    GlobalModule
  ],
  exports: [
    MealCalendarComponent
  ]
})
export class MealCalendarModule { }
