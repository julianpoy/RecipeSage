import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ShoppingListPage } from './shopping-list.page';
import { NewShoppingListItemModalPageModule } from '../new-shopping-list-item-modal/new-shopping-list-item-modal.module';
import { ShoppingListPopoverPageModule } from '../shopping-list-popover/shopping-list-popover.module';
import { NullStateModule } from '@/components/null-state/null-state.module';
import { ShoppingListItemModule } from '@/components/shopping-list-item/shopping-list-item.module';
import { ShoppingListGroupModule } from '@/components/shopping-list-group/shopping-list-group.module';
import {GlobalModule} from '@/global.module';

@NgModule({
  declarations: [
    ShoppingListPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: ShoppingListPage
      }
    ]),
    FormsModule,
    ReactiveFormsModule,
    NewShoppingListItemModalPageModule,
    ShoppingListPopoverPageModule,
    NullStateModule,
    ShoppingListItemModule,
    ShoppingListGroupModule,
    GlobalModule
  ],
})
export class ShoppingListPageModule {}
