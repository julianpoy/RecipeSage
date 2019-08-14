import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ShoppingListPage } from './shopping-list.page';

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
    ReactiveFormsModule
  ],
})
export class ShoppingListPageModule {}
