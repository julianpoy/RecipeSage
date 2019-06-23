import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { AddRecipeToMealPlanModalPage } from './add-recipe-to-meal-plan-modal.page';

@NgModule({
  declarations: [
    AddRecipeToMealPlanModalPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
  ],
  entryComponents: [
    AddRecipeToMealPlanModalPage,
  ],
})
export class AddRecipeToMealPlanModalPageModule {}
