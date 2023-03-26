import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { NewMealPlanModalPage } from './new-meal-plan-modal.page';
import { SelectCollaboratorsModule } from '~/components/select-collaborators/select-collaborators.module';

import { GlobalModule } from '~/global.module';

@NgModule({
  declarations: [
    NewMealPlanModalPage,
  ],
  imports: [
    GlobalModule,
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    SelectCollaboratorsModule,
  ],
  entryComponents: [
    NewMealPlanModalPage,
  ],
})
export class NewMealPlanModalPageModule {}
