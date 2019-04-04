import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { MealPlanPage } from './meal-plan';
import { ComponentsModule } from '../../../components/components.module';

@NgModule({
  declarations: [
    MealPlanPage,
  ],
  imports: [
    ComponentsModule,
    IonicPageModule.forChild(MealPlanPage),
  ],
})
export class MealPlanPageModule {}
