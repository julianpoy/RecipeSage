import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { NewMealPlanModalPage } from './new-meal-plan-modal.page';

@NgModule({
  declarations: [
    NewMealPlanModalPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: NewMealPlanModalPage
      }
    ])
  ],
})
export class NewMealPlanModalPageModule {}
