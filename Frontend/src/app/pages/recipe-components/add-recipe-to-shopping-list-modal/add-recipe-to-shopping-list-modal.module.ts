import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { AddRecipeToShoppingListModalPage } from './add-recipe-to-shopping-list-modal.page';
// import { ComponentsModule } from '@/components/components.module';

@NgModule({
  declarations: [
    AddRecipeToShoppingListModalPage,
  ],
  imports: [
    ComponentsModule,
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: AddRecipeToShoppingListModalPage
      }
    ])
  ],
})
export class AddRecipeToShoppingListModalPageModule {}
