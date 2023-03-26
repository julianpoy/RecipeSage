import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { HomePopoverPage } from './home-popover.page';
import { ResettableSelectPopoverPageModule } from '~/pages/resettable-select-popover/resettable-select-popover.module';
import { GlobalModule } from '~/global.module';

@NgModule({
  declarations: [
    HomePopoverPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    GlobalModule,
    ReactiveFormsModule,
    ResettableSelectPopoverPageModule,
  ],
  entryComponents: [
    HomePopoverPage
  ]
})
export class HomePopoverPageModule {}
