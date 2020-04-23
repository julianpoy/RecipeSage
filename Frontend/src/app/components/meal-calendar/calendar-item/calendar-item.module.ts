import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { CalendarItemComponent } from './calendar-item.component';

@NgModule({
  declarations: [
    CalendarItemComponent
  ],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [
    CalendarItemComponent
  ]
})
export class CalendarItemModule { }
