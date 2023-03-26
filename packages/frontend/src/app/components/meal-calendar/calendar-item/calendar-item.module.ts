import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { CalendarItemComponent } from './calendar-item.component';
import {GlobalModule} from '~/global.module';

@NgModule({
  declarations: [
    CalendarItemComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    GlobalModule
  ],
  exports: [
    CalendarItemComponent
  ]
})
export class CalendarItemModule { }
