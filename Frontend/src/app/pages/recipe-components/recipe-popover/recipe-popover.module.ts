import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { RecipePopoverPage } from './recipe-popover.page';

@NgModule({
  declarations: [
    RecipePopoverPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  entryComponents: [
    RecipePopoverPage
  ],
})
export class RecipePopoverPageModule {}
