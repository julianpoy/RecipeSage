import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ShareMealPlanModalPage } from './share-meal-plan-modal';

@NgModule({
  declarations: [
    ShareMealPlanModalPage,
  ],
  imports: [
    IonicPageModule.forChild(ShareMealPlanModalPage),
  ],
})
export class ShareMealPlanModalPageModule {}
