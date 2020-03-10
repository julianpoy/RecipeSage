import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { AuthModalPage } from './auth-modal.page';
import { TosClickwrapAgreementModule } from '@/components/tos-clickwrap-agreement/tos-clickwrap-agreement.module';

@NgModule({
  declarations: [
    AuthModalPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    TosClickwrapAgreementModule,
  ],
  entryComponents: [
    AuthModalPage
  ]
})
export class AuthModalPageModule {}
