import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { ShoppingListsPage } from './shopping-lists.page';

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
    ])
  ],
})
export class ShoppingListsPageModule {}
