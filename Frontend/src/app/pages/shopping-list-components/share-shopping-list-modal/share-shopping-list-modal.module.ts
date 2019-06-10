import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { ShareShoppingListModalPage } from './share-shopping-list-modal.page';

@NgModule({
  declarations: [
    ShareShoppingListModalPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: ShareShoppingListModalPage
      }
    ])
  ],
})
export class ShareShoppingListModalPageModule {}
