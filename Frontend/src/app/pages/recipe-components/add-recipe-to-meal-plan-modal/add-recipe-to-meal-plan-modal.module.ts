import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AddRecipeToMealPlanModalPage } from './add-recipe-to-meal-plan-modal.page';
import { MealCalendarModule } from '@/components/meal-calendar/meal-calendar.module';
import { SelectMealModule } from '@/components/select-meal/select-meal.module';
import { NewMealPlanModalPageModule } from '@/pages/meal-plan-components/new-meal-plan-modal/new-meal-plan-modal.module';

import { GlobalModule } from '@/global.module';

@NgModule({
  declarations: [
    AddRecipeToMealPlanModalPage,
  ],
  imports: [
    GlobalModule,
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    MealCalendarModule,
    SelectMealModule,
    NewMealPlanModalPageModule,
  ],
  entryComponents: [
    AddRecipeToMealPlanModalPage,
  ],
})
export class AddRecipeToMealPlanModalPageModule {}
