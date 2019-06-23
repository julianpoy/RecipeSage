import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { NewShoppingListItemModalPage } from './new-shopping-list-item-modal.page';

@NgModule({
  declarations: [
    NewShoppingListItemModalPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
  ],
  entryComponents: [
    NewShoppingListItemModalPage,
  ],
})
export class NewShoppingListItemModalPageModule {}
