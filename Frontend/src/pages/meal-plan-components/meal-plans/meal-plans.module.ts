import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { MealPlansPage } from './meal-plans';

@NgModule({
  declarations: [
    MealPlansPage,
  ],
  imports: [
    IonicPageModule.forChild(MealPlansPage),
  ],
})
export class MealPlansPageModule {}
