import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { ShoppingListsPage } from './shopping-lists.page';
import { NewShoppingListModalPageModule } from '../new-shopping-list-modal/new-shopping-list-modal.module';
import { NullStateModule } from '@/components/null-state/null-state.module';

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
    NewShoppingListModalPageModule,
    NullStateModule
  ],
})
export class ShoppingListsPageModule {}
