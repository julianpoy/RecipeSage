import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { RecipePreviewComponent } from './recipe-preview.component';

@NgModule({
  declarations: [
    RecipePreviewComponent
  ],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [
    RecipePreviewComponent
  ]
})
export class RecipePreviewModule { }
