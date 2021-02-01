import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { SelectIngredientsComponent } from './select-ingredients.component';
import { ScaleRecipeModule } from '@/modals/scale-recipe/scale-recipe.module';

@NgModule({
  declarations: [
    SelectIngredientsComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    ScaleRecipeModule,
  ],
  exports: [
    SelectIngredientsComponent
  ]
})
export class SelectIngredientsModule { }
