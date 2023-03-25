import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { TosClickwrapAgreementComponent } from './tos-clickwrap-agreement.component';
import {GlobalModule} from '@/global.module';

@NgModule({
  declarations: [
    TosClickwrapAgreementComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule,
    GlobalModule,
  ],
  exports: [
    TosClickwrapAgreementComponent
  ]
})
export class TosClickwrapAgreementModule { }
