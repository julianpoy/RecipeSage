import { NgModule } from '@angular/core';
import { SelectIngredientsComponent } from './select-ingredients/select-ingredients';
import { SelectRecipeComponent } from './select-recipe/select-recipe';
import { CommonModule } from '@angular/common';
import { IonicModule } from 'ionic-angular';
@NgModule({
	declarations: [
    SelectRecipeComponent,
    SelectIngredientsComponent
  ],
	imports: [
    CommonModule,
    IonicModule
  ],
	exports: [
    SelectRecipeComponent,
    SelectIngredientsComponent
  ]
})
export class ComponentsModule {}
