import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { ContributeThankYouPage } from './contribute-thankyou.page';

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
    ])
  ],
})
export class ContributeThankYouPageModule {}
