import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { SelfhostWarningItemComponent } from './selfhost-warning-item.component';

@NgModule({
  declarations: [
    SelfhostWarningItemComponent
  ],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [
    SelfhostWarningItemComponent
  ]
})
export class SelfhostWarningItemModule { }
