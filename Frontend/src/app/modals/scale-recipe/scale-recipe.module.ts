import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { ScaleRecipeComponent } from './scale-recipe.component';

@NgModule({
  declarations: [
    ScaleRecipeComponent,
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule
  ],
  entryComponents: [
    ScaleRecipeComponent
  ]
})
export class ScaleRecipeModule {}
