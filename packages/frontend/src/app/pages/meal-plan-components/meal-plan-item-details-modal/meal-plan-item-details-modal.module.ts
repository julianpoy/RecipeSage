import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { MealPlanItemDetailsModalPage } from './meal-plan-item-details-modal.page';

import { GlobalModule } from '~/global.module';

@NgModule({
  declarations: [
    MealPlanItemDetailsModalPage,
  ],
  imports: [
    GlobalModule,
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
