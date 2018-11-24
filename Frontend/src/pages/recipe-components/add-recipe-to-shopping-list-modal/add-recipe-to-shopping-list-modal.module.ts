import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { AddRecipeToShoppingListModalPage } from './add-recipe-to-shopping-list-modal';
import { ComponentsModule } from '../../../components/components.module';

@NgModule({
  declarations: [
    AddRecipeToShoppingListModalPage,
  ],
  imports: [
    ComponentsModule,
    IonicPageModule.forChild(AddRecipeToShoppingListModalPage),
  ],
})
export class AddRecipeToShoppingListModalPageModule {}
