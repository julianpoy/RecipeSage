import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { HomeSearchFilterPopoverPage } from './home-search-filter-popover.page';
import { ResettableSelectPopoverPageModule } from '~/pages/resettable-select-popover/resettable-select-popover.module';
import { GlobalModule } from '~/global.module';

@NgModule({
  declarations: [
    HomeSearchFilterPopoverPage,
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
    HomeSearchFilterPopoverPage
  ]
})
export class HomeSearchFilterPopoverModule {}
