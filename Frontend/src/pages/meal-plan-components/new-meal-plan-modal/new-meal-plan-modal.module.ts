import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { NewMealPlanModalPage } from './new-meal-plan-modal';
import { ComponentsModule } from '../../../components/components.module';

@NgModule({
  declarations: [
    NewMealPlanModalPage,
  ],
  imports: [
    ComponentsModule,
    IonicPageModule.forChild(NewMealPlanModalPage),
  ],
})
export class NewMealPlanModalPageModule {}
