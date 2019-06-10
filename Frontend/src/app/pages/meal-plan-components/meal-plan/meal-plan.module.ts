import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { MealPlanPage } from './meal-plan.page';
// import { ComponentsModule } from '@/components/components.module';

@NgModule({
  declarations: [
    MealPlanPage,
  ],
  imports: [
    ComponentsModule,
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: MealPlanPage
      }
    ])
  ],
})
export class MealPlanPageModule {}
