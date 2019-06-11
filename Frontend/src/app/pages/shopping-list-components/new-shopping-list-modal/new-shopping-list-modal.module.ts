import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { NewShoppingListModalPage } from './new-shopping-list-modal.page';

@NgModule({
  declarations: [
    NewShoppingListModalPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: NewShoppingListModalPage
      }
    ])
  ],
})
export class NewShoppingListModalPageModule {}
