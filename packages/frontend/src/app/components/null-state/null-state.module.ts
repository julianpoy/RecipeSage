import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { NullStateComponent } from './null-state.component';
import {GlobalModule} from '~/global.module';

@NgModule({
  declarations: [
    NullStateComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    GlobalModule,
  ],
  exports: [
    NullStateComponent
  ]
})
export class NullStateModule { }
