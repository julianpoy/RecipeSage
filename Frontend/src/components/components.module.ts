import { NgModule } from '@angular/core';
import { SelectIngredientsComponent } from './select-ingredients/select-ingredients';
import { SelectRecipeComponent } from './select-recipe/select-recipe';
import { CommonModule } from '@angular/common';
import { IonicModule } from 'ionic-angular';
import { SelectCollaboratorsComponent } from './select-collaborators/select-collaborators';
import { PipesModule } from '../pipes/pipes.module';
@NgModule({
	declarations: [
    SelectRecipeComponent,
    SelectIngredientsComponent,
    SelectCollaboratorsComponent
  ],
	imports: [
    CommonModule,
    IonicModule,
    PipesModule
  ],
	exports: [
    SelectRecipeComponent,
    SelectIngredientsComponent,
    SelectCollaboratorsComponent
  ]
})
export class ComponentsModule {}
