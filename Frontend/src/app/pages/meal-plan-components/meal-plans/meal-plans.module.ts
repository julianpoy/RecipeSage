import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { MealPlansPage } from './meal-plans.page';
import { NewMealPlanModalPageModule } from '@/pages/meal-plan-components/new-meal-plan-modal/new-meal-plan-modal.module';
import { NullStateModule } from '@/components/null-state/null-state.module';

import { GlobalModule } from '@/global.module';

@NgModule({
  declarations: [
    MealPlansPage,
  ],
  imports: [
    GlobalModule,
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: MealPlansPage
      }
    ]),
    NewMealPlanModalPageModule,
    NullStateModule
  ],
})
export class MealPlansPageModule {}
