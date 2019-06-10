import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { NewShoppingListItemModalPage } from './new-shopping-list-item-modal.page';
// import { ComponentsModule } from '@/components/components.module';

@NgModule({
  declarations: [
    NewShoppingListItemModalPage,
  ],
  imports: [
    ComponentsModule,
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: NewShoppingListItemModalPage
      }
    ])
  ],
})
export class NewShoppingListItemModalPageModule {}
