import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { SelectMealComponent } from './select-meal.component';
import {GlobalModule} from '@/global.module';

@NgModule({
  declarations: [
    SelectMealComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    GlobalModule
  ],
  exports: [
    SelectMealComponent
  ]
})
export class SelectMealModule { }
