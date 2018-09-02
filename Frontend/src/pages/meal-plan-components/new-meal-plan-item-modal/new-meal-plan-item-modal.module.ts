import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { NewMealPlanItemModalPage } from './new-meal-plan-item-modal';
import { ComponentsModule } from '../../../components/components.module';

@NgModule({
  declarations: [
    NewMealPlanItemModalPage,
  ],
  imports: [
    ComponentsModule,
    IonicPageModule.forChild(NewMealPlanItemModalPage),
  ],
})
export class NewMealPlanItemModalPageModule {}
