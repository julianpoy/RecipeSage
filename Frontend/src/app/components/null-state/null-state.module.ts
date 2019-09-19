import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { NullStateComponent } from './null-state.component';

@NgModule({
  declarations: [
    NullStateComponent
  ],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [
    NullStateComponent
  ]
})
export class NullStateModule { }
