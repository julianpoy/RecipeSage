import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { AddRecipeToMealPlanModalPage } from './add-recipe-to-meal-plan-modal.page';
// import { ComponentsModule } from '@/components/components.module';

@NgModule({
  declarations: [
    AddRecipeToMealPlanModalPage,
  ],
  imports: [
    ComponentsModule,
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
