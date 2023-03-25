import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { EditRecipePopoverPage } from './edit-recipe-popover.page';

import { GlobalModule } from '~/global.module';

@NgModule({
  declarations: [
    EditRecipePopoverPage,
  ],
  imports: [
    GlobalModule,
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
