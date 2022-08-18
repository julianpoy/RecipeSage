import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { NewShoppingListModalPage } from './new-shopping-list-modal.page';
import { SelectCollaboratorsModule } from '@/components/select-collaborators/select-collaborators.module';
import {GlobalModule} from '@/global.module';

@NgModule({
  declarations: [
    NewShoppingListModalPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    SelectCollaboratorsModule,
    GlobalModule
  ],
  entryComponents: [
    NewShoppingListModalPage,
  ],
})
export class NewShoppingListModalPageModule {}
