import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { ContributeThankYouPage } from './contribute-thankyou.page';
import { LogoIconModule } from '~/components/logo-icon/logo-icon.module';

import { GlobalModule } from '~/global.module';

@NgModule({
  declarations: [
    ContributeThankYouPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: ContributeThankYouPage
      }
    ]),
    GlobalModule,
    LogoIconModule,
  ],
})
export class ContributeThankYouPageModule {}
