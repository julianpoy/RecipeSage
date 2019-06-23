import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { AddRecipeToShoppingListModalPage } from './add-recipe-to-shopping-list-modal.page';

@NgModule({
  declarations: [
    AddRecipeToShoppingListModalPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
  ],
  entryComponents: [
    AddRecipeToShoppingListModalPage,
  ],
})
export class AddRecipeToShoppingListModalPageModule {}
