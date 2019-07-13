import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { SelectIngredientsComponent } from './select-ingredients.component';

@NgModule({
  declarations: [
    SelectIngredientsComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  exports: [
    SelectIngredientsComponent
  ]
})
export class SelectIngredientsModule { }
