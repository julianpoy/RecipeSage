import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { NewMealPlanItemModalPage } from './new-meal-plan-item-modal.page';

@NgModule({
  declarations: [
    NewMealPlanItemModalPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
  ],
  entryComponents: [
    NewMealPlanItemModalPage,
  ],
})
export class NewMealPlanItemModalPageModule {}
