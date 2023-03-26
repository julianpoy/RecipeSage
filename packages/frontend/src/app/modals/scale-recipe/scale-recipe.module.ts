import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { ScaleRecipeComponent } from './scale-recipe.component';
import {GlobalModule} from '~/global.module';

@NgModule({
  declarations: [
    ScaleRecipeComponent,
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    GlobalModule,
  ],
  entryComponents: [
    ScaleRecipeComponent
  ]
})
export class ScaleRecipeModule {}
