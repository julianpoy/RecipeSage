import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { AuthModalPage } from './auth-modal.page';
import { TosClickwrapAgreementModule } from '@/components/tos-clickwrap-agreement/tos-clickwrap-agreement.module';

import { GlobalModule } from '@/global.module';

@NgModule({
  declarations: [
    AuthModalPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    GlobalModule,
    TosClickwrapAgreementModule,
  ],
  entryComponents: [
    AuthModalPage
  ]
})
export class AuthModalPageModule {}
