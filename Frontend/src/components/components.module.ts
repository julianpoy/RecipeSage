import { NgModule } from '@angular/core';
import { SelectIngredientsComponent } from './select-ingredients/select-ingredients';
import { SelectRecipeComponent } from './select-recipe/select-recipe';
import { CommonModule } from '@angular/common';
import { IonicModule } from 'ionic-angular';
import { SelectCollaboratorsComponent } from './select-collaborators/select-collaborators';
import { LogoIconComponent } from './logo-icon/logo-icon';
import { PipesModule } from '../pipes/pipes.module';
@NgModule({
	declarations: [
    SelectRecipeComponent,
    SelectIngredientsComponent,
    SelectCollaboratorsComponent,
    LogoIconComponent
  ],
	imports: [
    CommonModule,
    IonicModule,
    PipesModule
  ],
	exports: [
    SelectRecipeComponent,
    SelectIngredientsComponent,
    SelectCollaboratorsComponent,
    LogoIconComponent
  ]
})
export class ComponentsModule {}
