import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { SelectRecipeComponent } from './select-recipe.component';
import {GlobalModule} from '~/global.module';

@NgModule({
  declarations: [
    SelectRecipeComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    GlobalModule
  ],
  exports: [
    SelectRecipeComponent
  ]
})
export class SelectRecipeModule { }
