import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { AddRecipeToShoppingListModalPage } from './add-recipe-to-shopping-list-modal';

@NgModule({
  declarations: [
    AddRecipeToShoppingListModalPage,
  ],
  imports: [
    IonicPageModule.forChild(AddRecipeToShoppingListModalPage),
  ],
})
export class AddRecipeToShoppingListModalPageModule {}
