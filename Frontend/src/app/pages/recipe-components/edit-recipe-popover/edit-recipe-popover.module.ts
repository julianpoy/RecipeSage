import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { EditRecipePopoverPage } from './edit-recipe-popover.page';

@NgModule({
  declarations: [
    EditRecipePopoverPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule
  ],
  entryComponents: [
    EditRecipePopoverPage
  ]
})
export class EditRecipePopoverPageModule {}
