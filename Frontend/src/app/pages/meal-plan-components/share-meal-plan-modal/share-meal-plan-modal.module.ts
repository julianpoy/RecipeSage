import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { ShareMealPlanModalPage } from './share-meal-plan-modal.page';

@NgModule({
  declarations: [
    ShareMealPlanModalPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
  ],
  entryComponents: [
    ShareMealPlanModalPage,
  ],
})
export class ShareMealPlanModalPageModule {}
