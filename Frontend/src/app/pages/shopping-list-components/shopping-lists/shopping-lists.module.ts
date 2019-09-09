import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { ShoppingListsPage } from './shopping-lists.page';
import { NewShoppingListModalPageModule } from '../new-shopping-list-modal/new-shopping-list-modal.module';

@NgModule({
  declarations: [
    ShoppingListsPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: ShoppingListsPage
      }
    ]),
    NewShoppingListModalPageModule
  ],
})
export class ShoppingListsPageModule {}
