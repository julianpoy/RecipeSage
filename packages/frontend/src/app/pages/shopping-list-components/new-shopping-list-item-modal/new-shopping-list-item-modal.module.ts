import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { NewShoppingListItemModalPage } from './new-shopping-list-item-modal.page';

import { SelectRecipeModule } from '@/components/select-recipe/select-recipe.module';
import { SelectIngredientsModule } from '@/components/select-ingredients/select-ingredients.module';
import {GlobalModule} from '@/global.module';

@NgModule({
  declarations: [
    NewShoppingListItemModalPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    SelectRecipeModule,
    SelectIngredientsModule,
    GlobalModule
  ],
  entryComponents: [
    NewShoppingListItemModalPage,
  ],
})
export class NewShoppingListItemModalPageModule {}
