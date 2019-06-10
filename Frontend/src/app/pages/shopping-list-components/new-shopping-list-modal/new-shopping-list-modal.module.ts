import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { NewShoppingListModalPage } from './new-shopping-list-modal.page';
// import { ComponentsModule } from '@/components/components.module';

@NgModule({
  declarations: [
    NewShoppingListModalPage,
  ],
  imports: [
    ComponentsModule,
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
