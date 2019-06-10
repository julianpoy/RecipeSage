import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { ShareModalPage } from './share-modal.page';
// import { ComponentsModule } from '@/components/components.module';

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
    ]),
    ComponentsModule
  ],
})
export class ShareModalPageModule {}
