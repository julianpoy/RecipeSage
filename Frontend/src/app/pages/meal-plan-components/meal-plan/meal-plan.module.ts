import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { MealPlanPage } from './meal-plan.page';
import { MealCalendarModule } from '@/components/meal-calendar/meal-calendar.module';
import { NewMealPlanItemModalPageModule } from '@/pages/meal-plan-components/new-meal-plan-item-modal/new-meal-plan-item-modal.module';
import { AddRecipeToShoppingListModalPageModule } from '@/pages/recipe-components/add-recipe-to-shopping-list-modal/add-recipe-to-shopping-list-modal.module';
import { MealPlanPopoverPageModule } from '@/pages/meal-plan-components/meal-plan-popover/meal-plan-popover.module';
import { MealPlanItemDetailsModalPageModule } from '@/pages/meal-plan-components/meal-plan-item-details-modal/meal-plan-item-details-modal.module';

@NgModule({
  declarations: [
    MealPlanPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: MealPlanPage
      }
    ]),
    MealCalendarModule,
    NewMealPlanItemModalPageModule,
    AddRecipeToShoppingListModalPageModule,
    MealPlanPopoverPageModule,
    MealPlanItemDetailsModalPageModule,
  ],
})
export class MealPlanPageModule {}
