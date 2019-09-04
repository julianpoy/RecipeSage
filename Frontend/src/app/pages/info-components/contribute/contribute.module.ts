import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { ContributePage } from './contribute.page';
import { LogoIconModule } from '@/components/logo-icon/logo-icon.module';

@NgModule({
  declarations: [
    ContributePage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: ContributePage
      }
    ]),
    LogoIconModule,
  ],
})
export class ContributePageModule {}
