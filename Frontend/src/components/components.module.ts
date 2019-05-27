import { NgModule } from '@angular/core';
import { SelectIngredientsComponent } from './select-ingredients/select-ingredients';
import { SelectRecipeComponent } from './select-recipe/select-recipe';
import { CommonModule } from '@angular/common';
import { IonicModule } from 'ionic-angular';
import { SelectCollaboratorsComponent } from './select-collaborators/select-collaborators';
import { SelectMealComponent } from './select-meal/select-meal';
import { MealCalendarComponent } from './meal-calendar/meal-calendar';
import { LogoIconComponent } from './logo-icon/logo-icon';
import { RecipePreviewComponent } from './recipe-preview/recipe-preview';
import { PipesModule } from '../pipes/pipes.module';
@NgModule({
	declarations: [
    SelectRecipeComponent,
    SelectIngredientsComponent,
    SelectCollaboratorsComponent,
    SelectMealComponent,
    MealCalendarComponent,
    LogoIconComponent,
    RecipePreviewComponent
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
    SelectMealComponent,
    MealCalendarComponent,
    LogoIconComponent,
    RecipePreviewComponent
  ]
})
export class ComponentsModule {}
