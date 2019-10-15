import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { ShareShoppingListModalPage } from './share-shopping-list-modal.page';

@NgModule({
  declarations: [
    ShareShoppingListModalPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
  ],
  entryComponents: [
    ShareShoppingListModalPage,
  ],
})
export class ShareShoppingListModalPageModule {}
