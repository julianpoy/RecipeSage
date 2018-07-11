import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ShareShoppingListModalPage } from './share-shopping-list-modal';

@NgModule({
  declarations: [
    ShareShoppingListModalPage,
  ],
  imports: [
    IonicPageModule.forChild(ShareShoppingListModalPage),
  ],
})
export class ShareShoppingListModalPageModule {}
