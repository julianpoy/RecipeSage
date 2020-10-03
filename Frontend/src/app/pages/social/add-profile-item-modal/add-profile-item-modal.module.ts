import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { AddProfileItemModalPage } from './add-friend-modal.page';
import { SelectRecipeModule } from '../../../components/select-recipe/select-recipe.module';
import { SelectLabelModule } from '../../../components/select-label/module';

@NgModule({
  declarations: [
    AddProfileItemModalPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    SelectRecipeModule,
    SelectLabelModule,
  ],
  entryComponents: [
    AddProfileItemModalPage,
  ],
})
export class AddProfileItemModalModule {}
