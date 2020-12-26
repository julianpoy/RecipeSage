import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { ShareProfileModalPage } from './share-profile-modal.page';

@NgModule({
  declarations: [
    ShareProfileModalPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  entryComponents: [
    ShareProfileModalPage,
  ],
})
export class ShareProfileModalPageModule {}
