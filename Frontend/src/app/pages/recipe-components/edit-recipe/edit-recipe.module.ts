import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { EditRecipePage } from './edit-recipe.page';

@NgModule({
  declarations: [
    EditRecipePage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: EditRecipePage
      }
    ])
  ],
})
export class EditRecipePageModule {}
