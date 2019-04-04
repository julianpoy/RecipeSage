import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { AddRecipeToMealPlanModalPage } from './add-recipe-to-meal-plan-modal';
import { ComponentsModule } from '../../../components/components.module';

@NgModule({
  declarations: [
    AddRecipeToMealPlanModalPage,
  ],
  imports: [
    ComponentsModule,
    IonicPageModule.forChild(AddRecipeToMealPlanModalPage),
  ],
})
export class AddRecipeToMealPlanModalPageModule {}
