import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { LabelsPopoverPage } from './labels-popover.page';

@NgModule({
  declarations: [
    LabelsPopoverPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  entryComponents: [
    LabelsPopoverPage
  ]
})
export class LabelsPopoverPageModule {}
