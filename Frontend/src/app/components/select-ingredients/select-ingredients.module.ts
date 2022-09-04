import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { SelectIngredientsComponent } from './select-ingredients.component';
import { ScaleRecipeModule } from '@/modals/scale-recipe/scale-recipe.module';
import {GlobalModule} from '@/global.module';

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
    GlobalModule,
  ],
  exports: [
    SelectIngredientsComponent
  ]
})
export class SelectIngredientsModule { }
