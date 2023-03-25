import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { SelfhostWarningItemComponent } from './selfhost-warning-item.component';
import {GlobalModule} from '@/global.module';

@NgModule({
  declarations: [
    SelfhostWarningItemComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    GlobalModule
  ],
  exports: [
    SelfhostWarningItemComponent
  ]
})
export class SelfhostWarningItemModule { }
