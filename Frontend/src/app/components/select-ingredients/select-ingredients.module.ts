import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { SelectIngredientsComponent } from './select-ingredients.component';

@NgModule({
  declarations: [
    SelectIngredientsComponent
  ],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [
    SelectIngredientsComponent
  ]
})
export class SelectIngredientsModule { }
