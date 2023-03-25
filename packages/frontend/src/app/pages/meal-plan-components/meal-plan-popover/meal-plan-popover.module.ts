import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { MealPlanPopoverPage } from './meal-plan-popover.page';

import { GlobalModule } from '@/global.module';

@NgModule({
  declarations: [
    MealPlanPopoverPage,
  ],
  imports: [
    GlobalModule,
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  entryComponents: [
    MealPlanPopoverPage
  ],
})
export class MealPlanPopoverPageModule {}
