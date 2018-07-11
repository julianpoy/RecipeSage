import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ShoppingListsPage } from './shopping-lists';

@NgModule({
  declarations: [
    ShoppingListsPage,
  ],
  imports: [
    IonicPageModule.forChild(ShoppingListsPage),
  ],
})
export class ShoppingListsPageModule {}
