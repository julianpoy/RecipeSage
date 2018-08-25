import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { NewMealPlanModalPage } from './new-meal-plan-modal';

@NgModule({
  declarations: [
    NewMealPlanModalPage,
  ],
  imports: [
    IonicPageModule.forChild(NewMealPlanModalPage),
  ],
})
export class NewMealPlanModalPageModule {}
