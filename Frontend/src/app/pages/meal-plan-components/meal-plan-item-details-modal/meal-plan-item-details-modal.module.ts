import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { MealPlanItemDetailsModalPage } from './meal-plan-item-details-modal.page';

@NgModule({
  declarations: [
    MealPlanItemDetailsModalPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  entryComponents: [
    MealPlanItemDetailsModalPage,
  ],
})
export class MealPlanItemDetailsModalPageModule {}
