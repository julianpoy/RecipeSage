import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { ShareMealPlanModalPage } from './share-meal-plan-modal.page';

@NgModule({
  declarations: [
    ShareMealPlanModalPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: ShareMealPlanModalPage
      }
    ])
  ],
})
export class ShareMealPlanModalPageModule {}
