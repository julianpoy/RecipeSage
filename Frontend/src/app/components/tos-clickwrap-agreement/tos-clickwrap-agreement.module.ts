import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { TosClickwrapAgreementComponent } from './tos-clickwrap-agreement.component';

@NgModule({
  declarations: [
    TosClickwrapAgreementComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule,
  ],
  exports: [
    TosClickwrapAgreementComponent
  ]
})
export class TosClickwrapAgreementModule { }
