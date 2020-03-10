import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ShoppingListGroupComponent } from './shopping-list-group.component';
import { ShoppingListItemModule } from '@/components/shopping-list-item/shopping-list-item.module';

@NgModule({
  declarations: [
    ShoppingListGroupComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    ShoppingListItemModule
  ],
  exports: [
    ShoppingListGroupComponent
  ]
})
export class ShoppingListGroupModule { }
