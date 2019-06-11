import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { AddRecipeToMealPlanModalPage } from './add-recipe-to-meal-plan-modal.page';

@NgModule({
  declarations: [
    AddRecipeToMealPlanModalPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: AddRecipeToMealPlanModalPage
      }
    ])
  ],
})
export class AddRecipeToMealPlanModalPageModule {}
