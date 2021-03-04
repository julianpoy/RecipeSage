import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { ResettableSelectPopoverPage } from './resettable-select-popover.page';
import { GlobaModule } from '@/global.module';

@NgModule({
  declarations: [
    ResettableSelectPopoverPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    GlobalModule,
  ],
  entryComponents: [
    ResettableSelectPopoverPage
  ]
})
export class ResettableSelectPopoverPageModule {}
