import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AddRecipeToMealPlanModalPage } from './add-recipe-to-meal-plan-modal.page';
import { MealCalendarModule } from '@/components/meal-calendar/meal-calendar.module';
import { SelectMealModule } from '@/components/select-meal/select-meal.module';

@NgModule({
  declarations: [
    AddRecipeToMealPlanModalPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    MealCalendarModule,
    SelectMealModule,
  ],
  entryComponents: [
    AddRecipeToMealPlanModalPage,
  ],
})
export class AddRecipeToMealPlanModalPageModule {}
