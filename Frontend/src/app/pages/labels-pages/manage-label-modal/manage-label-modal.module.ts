import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { ManageLabelModalPage } from './manage-label-modal.page';

@NgModule({
  declarations: [
    ManageLabelModalPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
  ],
  entryComponents: [
    ManageLabelModalPage,
  ],
})
export class ManageLabelModalPageModule {}
