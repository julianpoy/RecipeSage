import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { SelectMealComponent } from './select-meal.component';

@NgModule({
  declarations: [
    SelectMealComponent
  ],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [
    SelectMealComponent
  ]
})
export class SelectMealModule { }
