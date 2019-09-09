import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { MealCalendarComponent } from './meal-calendar.component';

@NgModule({
  declarations: [
    MealCalendarComponent
  ],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [
    MealCalendarComponent
  ]
})
export class MealCalendarModule { }
