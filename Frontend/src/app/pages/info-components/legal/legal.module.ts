import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { LegalPage } from './legal.page';

@NgModule({
  declarations: [
    LegalPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: LegalPage
      }
    ])
  ],
})
export class LegalPageModule {}
