import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { ShareMealPlanModalPage } from './share-meal-plan-modal.page';
import {GlobalModule} from '@/global.module';

@NgModule({
  declarations: [
    ShareMealPlanModalPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    GlobalModule,
  ],
  entryComponents: [
    ShareMealPlanModalPage,
  ],
})
export class ShareMealPlanModalPageModule {}
