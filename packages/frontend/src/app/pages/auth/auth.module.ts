import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';

import { AuthPage } from './auth.page';
import { LogoIconModule } from '@/components/logo-icon/logo-icon.module';
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
    FormsModule,
    ReactiveFormsModule,
    LogoIconModule,
    TosClickwrapAgreementModule
  ],
})
export class AuthPageModule {}
