import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { MealPlansPage } from './meal-plans.page';

@NgModule({
  declarations: [
    MealPlansPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: MealPlansPage
      }
    ])
  ],
})
export class MealPlansPageModule {}
