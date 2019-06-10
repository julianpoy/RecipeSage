import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { NewMealPlanItemModalPage } from './new-meal-plan-item-modal.page';
// import { ComponentsModule } from '@/components/components.module';

@NgModule({
  declarations: [
    NewMealPlanItemModalPage,
  ],
  imports: [
    ComponentsModule,
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: NewMealPlanItemModalPage
      }
    ])
  ],
})
export class NewMealPlanItemModalPageModule {}
