import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { NewMealPlanModalPage } from './new-meal-plan-modal.page';

@NgModule({
  declarations: [
    NewMealPlanModalPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
  ],
  entryComponents: [
    NewMealPlanModalPage,
  ],
})
export class NewMealPlanModalPageModule {}
