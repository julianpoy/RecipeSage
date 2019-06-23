import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { NewShoppingListModalPage } from './new-shopping-list-modal.page';

@NgModule({
  declarations: [
    NewShoppingListModalPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
  ],
  entryComponents: [
    NewShoppingListModalPage,
  ],
})
export class NewShoppingListModalPageModule {}
