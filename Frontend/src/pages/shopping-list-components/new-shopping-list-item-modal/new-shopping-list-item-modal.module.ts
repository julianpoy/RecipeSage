import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { NewShoppingListItemModalPage } from './new-shopping-list-item-modal';

@NgModule({
  declarations: [
    NewShoppingListItemModalPage,
  ],
  imports: [
    IonicPageModule.forChild(NewShoppingListItemModalPage),
  ],
})
export class NewShoppingListItemModalPageModule {}
