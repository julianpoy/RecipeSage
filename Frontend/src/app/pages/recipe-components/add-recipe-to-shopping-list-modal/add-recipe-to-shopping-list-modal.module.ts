import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AddRecipeToShoppingListModalPage } from './add-recipe-to-shopping-list-modal.page';
import { SelectIngredientsModule } from '@/components/select-ingredients/select-ingredients.module';
import { NewShoppingListModalPageModule } from '@/pages/shopping-list-components/new-shopping-list-modal/new-shopping-list-modal.module';

import { GlobalModule } from '@/global.module';

@NgModule({
  declarations: [
    AddRecipeToShoppingListModalPage,
  ],
  imports: [
    GlobalModule,
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    SelectIngredientsModule,
    NewShoppingListModalPageModule,
  ],
  entryComponents: [
    AddRecipeToShoppingListModalPage,
  ],
})
export class AddRecipeToShoppingListModalPageModule {}
