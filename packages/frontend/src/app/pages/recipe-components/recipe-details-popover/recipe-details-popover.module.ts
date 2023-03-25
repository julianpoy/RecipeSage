import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { RecipeDetailsPopoverPage } from './recipe-details-popover.page';
import { GlobalModule } from '@/global.module';

@NgModule({
  declarations: [
    RecipeDetailsPopoverPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    GlobalModule,
  ],
  entryComponents: [
    RecipeDetailsPopoverPage
  ]
})
export class RecipeDetailsPopoverPageModule {}
