import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { AuthPage } from './auth.page';
import { TosClickwrapAgreementModule } from '@/components/tos-clickwrap-agreement/tos-clickwrap-agreement.module';

import { GlobalModule } from '@/global.module';

@NgModule({
  declarations: [
    AuthPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: AuthPage
      }
    ]),
    GlobalModule,
    TosClickwrapAgreementModule
  ],
})
export class AuthPageModule {}
