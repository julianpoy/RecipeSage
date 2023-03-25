import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { LegalPage } from './legal.page';
import {GlobalModule} from '~/global.module';

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
    ]),
    GlobalModule
  ],
})
export class LegalPageModule {}
