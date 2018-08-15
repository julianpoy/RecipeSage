import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ShoppingListPopoverPage } from './shopping-list-popover';

@NgModule({
  declarations: [
    ShoppingListPopoverPage,
  ],
  imports: [
    IonicPageModule.forChild(ShoppingListPopoverPage),
  ],
})
export class ShoppingListPopoverPageModule {}
