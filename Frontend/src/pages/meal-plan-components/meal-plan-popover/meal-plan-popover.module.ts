import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { MealPlanPopoverPage } from './meal-plan-popover';

@NgModule({
  declarations: [
    MealPlanPopoverPage,
  ],
  imports: [
    IonicPageModule.forChild(MealPlanPopoverPage),
  ],
})
export class MealPlanPopoverPageModule {}
