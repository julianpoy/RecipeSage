import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { MealPlanPopoverPage } from './meal-plan-popover.page';

@NgModule({
  declarations: [
    MealPlanPopoverPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: MealPlanPopoverPage
      }
    ])
  ],
})
export class MealPlanPopoverPageModule {}
