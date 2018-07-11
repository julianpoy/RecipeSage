import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { NewShoppingListModalPage } from './new-shopping-list-modal';

@NgModule({
  declarations: [
    NewShoppingListModalPage,
  ],
  imports: [
    IonicPageModule.forChild(NewShoppingListModalPage),
  ],
})
export class NewShoppingListModalPageModule {}
