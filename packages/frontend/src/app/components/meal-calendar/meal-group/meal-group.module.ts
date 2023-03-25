import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { MealGroupComponent } from './meal-group.component';
import { CalendarItemModule } from '../calendar-item/calendar-item.module';
import {GlobalModule} from '@/global.module';

@NgModule({
  declarations: [
    MealGroupComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    CalendarItemModule,
    GlobalModule,
  ],
  exports: [
    MealGroupComponent
  ]
})
export class MealGroupModule { }
