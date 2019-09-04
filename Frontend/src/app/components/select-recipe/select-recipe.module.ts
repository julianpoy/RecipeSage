import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { SelectRecipeComponent } from './select-recipe.component';

@NgModule({
  declarations: [
    SelectRecipeComponent
  ],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [
    SelectRecipeComponent
  ]
})
export class SelectRecipeModule { }
