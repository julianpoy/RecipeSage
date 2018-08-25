import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { NewMealPlanItemModalPage } from './new-meal-plan-item-modal';

@NgModule({
  declarations: [
    NewMealPlanItemModalPage,
  ],
  imports: [
    IonicPageModule.forChild(NewMealPlanItemModalPage),
  ],
})
export class NewMealPlanItemModalPageModule {}
