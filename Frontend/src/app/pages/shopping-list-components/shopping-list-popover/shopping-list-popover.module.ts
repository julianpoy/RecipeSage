import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { ShoppingListPopoverPage } from './shopping-list-popover.page';

@NgModule({
  declarations: [
    ShoppingListPopoverPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: ShoppingListPopoverPage
      }
    ])
  ],
})
export class ShoppingListPopoverPageModule {}
