import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { ShareShoppingListModalPage } from './share-shopping-list-modal.page';
import {GlobalModule} from '@/global.module';

@NgModule({
  declarations: [
    ShareShoppingListModalPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    GlobalModule
  ],
  entryComponents: [
    ShareShoppingListModalPage,
  ],
})
export class ShareShoppingListModalPageModule {}
