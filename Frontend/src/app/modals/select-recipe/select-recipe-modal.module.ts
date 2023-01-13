import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { SelectRecipeModalComponent } from './select-recipe-modal.component';
import {GlobalModule} from '@/global.module';
import {SelectRecipeModule} from '@/components/select-recipe/select-recipe.module';

@NgModule({
  declarations: [
    SelectRecipeModalComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    GlobalModule,
    SelectRecipeModule
  ],
  exports: [
    SelectRecipeModalComponent
  ],
  entryComponents: [
    SelectRecipeModalComponent
  ]
})
export class SelectRecipeModalModule { }
