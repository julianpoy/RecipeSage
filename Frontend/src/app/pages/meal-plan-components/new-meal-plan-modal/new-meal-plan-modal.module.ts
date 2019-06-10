import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { NewMealPlanModalPage } from './new-meal-plan-modal.page';
// import { ComponentsModule } from '@/components/components.module';

@NgModule({
  declarations: [
    NewMealPlanModalPage,
  ],
  imports: [
    ComponentsModule,
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
