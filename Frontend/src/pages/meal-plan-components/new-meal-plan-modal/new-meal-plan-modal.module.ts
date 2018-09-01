import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { NewMealPlanModalPage } from './new-meal-plan-modal';
import { PipesModule } from './../../../pipes/pipes.module';

@NgModule({
  declarations: [
    NewMealPlanModalPage,
  ],
  imports: [
    PipesModule,
    IonicPageModule.forChild(NewMealPlanModalPage),
  ],
})
export class NewMealPlanModalPageModule {}
