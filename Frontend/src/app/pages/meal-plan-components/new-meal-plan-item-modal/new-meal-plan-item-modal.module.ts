import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { NewMealPlanItemModalPage } from './new-meal-plan-item-modal.page';
import { SelectRecipeModule } from '@/components/select-recipe/select-recipe.module';
import { SelectMealModule } from '@/components/select-meal/select-meal.module';

import { GlobalModule } from '@/global.module';

@NgModule({
  declarations: [
    NewMealPlanItemModalPage,
  ],
  imports: [
    GlobalModule,
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    SelectRecipeModule,
    SelectMealModule,
  ],
  entryComponents: [
    NewMealPlanItemModalPage,
  ],
})
export class NewMealPlanItemModalPageModule {}
