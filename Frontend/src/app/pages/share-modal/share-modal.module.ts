import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { ShareModalPage } from './share-modal.page';

@NgModule({
  declarations: [
    ShareModalPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: ShareModalPage
      }
    ])
  ],
})
export class ShareModalPageModule {}
